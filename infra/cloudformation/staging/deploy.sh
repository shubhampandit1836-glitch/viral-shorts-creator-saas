#!/usr/bin/env bash
# Deploys all AI Clip Finder staging stacks in order.
# Each template in templates/ is independently manageable.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "${DIR}/../../.." && pwd)"
REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-abhishek}"
export AWS_PROFILE
PREFIX="${PROJECT_PREFIX:-acf-staging}"
ENV="${ENVIRONMENT:-staging}"
FIREBASE_PROJECT="${FIREBASE_PROJECT_ID:-ai-clip-finder-8e055}"
CORS_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:3000}"
FIREBASE_SA_FILE="${FIREBASE_SA_FILE:-${ROOT}/apps/web/firestore-service-account.json}"
SECRET_NAME="${PREFIX}/firebase-service-account"

get_output() {
  aws cloudformation describe-stacks \
    --stack-name "$1" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue | [0]" \
    --output text
}

deploy_stack() {
  local name="$1"
  local template="$2"
  shift 2
  echo ""
  echo "━━━ Deploying ${name} ━━━"
  aws cloudformation deploy \
    --stack-name "${name}" \
    --template-file "${template}" \
    --parameter-overrides "$@" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "${REGION}" \
    --no-fail-on-empty-changeset
}

deploy_lambda_zip() {
  local fn_name="$1"
  local zip_path="$2"
  local zip_size
  zip_size=$(stat -f%z "${zip_path}" 2>/dev/null || stat -c%s "${zip_path}" 2>/dev/null || echo 0)
  echo "  → Updating ${fn_name} code ($(numfmt --to=iec "${zip_size}" 2>/dev/null || echo "${zip_size} bytes"))"

  if [[ "${zip_size}" -gt 45000000 ]]; then
    local deploy_bucket
    deploy_bucket=$(get_output "${PREFIX}-storage" ProcessingBucketName)
    local s3_key="lambda-deploy/${fn_name}-$(date +%s).zip"
    aws s3 cp "${zip_path}" "s3://${deploy_bucket}/${s3_key}" --region "${REGION}"
    aws lambda update-function-code \
      --function-name "${fn_name}" \
      --s3-bucket "${deploy_bucket}" \
      --s3-key "${s3_key}" \
      --region "${REGION}" \
      --output text \
      --query "LastUpdateStatus" > /dev/null
  else
    aws lambda update-function-code \
      --function-name "${fn_name}" \
      --zip-file "fileb://${zip_path}" \
      --region "${REGION}" \
      --output text \
      --query "LastUpdateStatus" > /dev/null
  fi
  aws lambda wait function-updated \
    --function-name "${fn_name}" \
    --region "${REGION}"
}

ensure_firebase_secret() {
  if [[ ! -f "${FIREBASE_SA_FILE}" ]]; then
    echo "ERROR: Firebase service account not found at ${FIREBASE_SA_FILE}"
    exit 1
  fi

  if aws secretsmanager describe-secret --secret-id "${SECRET_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    echo "Updating Firebase secret ${SECRET_NAME}..."
    aws secretsmanager put-secret-value \
      --secret-id "${SECRET_NAME}" \
      --secret-string "file://${FIREBASE_SA_FILE}" \
      --region "${REGION}"
  else
    echo "Creating Firebase secret ${SECRET_NAME}..."
    aws secretsmanager create-secret \
      --name "${SECRET_NAME}" \
      --description "Firebase service account for ${PREFIX} Lambdas" \
      --secret-string "file://${FIREBASE_SA_FILE}" \
      --region "${REGION}"
  fi

  FIREBASE_SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "${SECRET_NAME}" \
    --region "${REGION}" \
    --query "ARN" \
    --output text)
  echo "Firebase secret ARN: ${FIREBASE_SECRET_ARN}"
}

ensure_openai_secret() {
  local env_file="${ROOT}/infra/.env"
  local web_env="${ROOT}/apps/web/.env"

  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    set -a && source "${env_file}" && set +a
  elif [[ -f "${web_env}" ]]; then
    OPENAI_API_KEY=$(grep -E '^OPENAI_API_KEY=' "${web_env}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi

  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "WARNING: OPENAI_API_KEY not found in infra/.env or apps/web/.env — skipping OpenAI secret"
    return
  fi

  local openai_secret_name="${PREFIX}/openai-api-key"
  if aws secretsmanager describe-secret --secret-id "${openai_secret_name}" --region "${REGION}" >/dev/null 2>&1; then
    echo "Updating OpenAI secret..."
    aws secretsmanager put-secret-value \
      --secret-id "${openai_secret_name}" \
      --secret-string "{\"OPENAI_API_KEY\":\"${OPENAI_API_KEY}\"}" \
      --region "${REGION}"
  else
    echo "Creating OpenAI secret..."
    aws secretsmanager create-secret \
      --name "${openai_secret_name}" \
      --description "OpenAI API key for ${PREFIX} pipeline Lambdas" \
      --secret-string "{\"OPENAI_API_KEY\":\"${OPENAI_API_KEY}\"}" \
      --region "${REGION}"
  fi

  OPENAI_SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "${openai_secret_name}" \
    --region "${REGION}" \
    --query "ARN" \
    --output text)
  echo "OpenAI secret ARN: ${OPENAI_SECRET_ARN}"
}

wire_openai_env_to_lambdas() {
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "WARNING: OPENAI_API_KEY not set — skipping Lambda env wiring"
    return
  fi

  echo "Wiring OpenAI credentials to pipeline Lambdas..."
  for fn in ai-analyzer whisper-transcriber thumbnail-generator; do
    local full_name="${PREFIX}-${fn}"
    local current
    current=$(aws lambda get-function-configuration \
      --function-name "${full_name}" \
      --region "${REGION}" \
      --query 'Environment.Variables' \
      --output json 2>/dev/null || echo "{}")

    local env_file
    env_file=$(mktemp)
    OPENAI_API_KEY="${OPENAI_API_KEY}" OPENAI_SECRET_ARN="${OPENAI_SECRET_ARN:-}" python3 -c "
import json, os, sys
vars = json.loads(sys.argv[1])
vars['OPENAI_API_KEY'] = os.environ['OPENAI_API_KEY']
if os.environ.get('OPENAI_SECRET_ARN'):
    vars['OPENAI_SECRET_ARN'] = os.environ['OPENAI_SECRET_ARN']
payload = {'FunctionName': sys.argv[2], 'Environment': {'Variables': vars}}
open(sys.argv[3], 'w').write(json.dumps(payload))
" "${current}" "${full_name}" "${env_file}"

    aws lambda update-function-configuration \
      --region "${REGION}" \
      --cli-input-json "file://${env_file}" \
      --output text --query "LastUpdateStatus" > /dev/null

    rm -f "${env_file}"

    aws lambda wait function-updated --function-name "${full_name}" --region "${REGION}"
    echo "  ✓ ${full_name}"
  done
}

package_python_lambda() {
  local name="$1"
  local dir="${ROOT}/services/${name}"
  local build="${dir}/.build"
  local shared="${ROOT}/services/_shared/openai_client.py"
  local firestore_shared="${ROOT}/services/_shared/firestore_client.py"

  echo "  Packaging ${name}..."
  rm -rf "${build}" && mkdir -p "${build}"
  local py="${PYTHON_BIN:-python3.12}"
  if [[ -f "${dir}/requirements.txt" ]]; then
    "${py}" -m pip install -r "${dir}/requirements.txt" -t "${build}" --quiet --upgrade \
      --platform manylinux2014_x86_64 --implementation cp --python-version 3.12 --only-binary=:all: 2>/dev/null \
      || "${py}" -m pip install -r "${dir}/requirements.txt" -t "${build}" --quiet --upgrade
  fi
  cp "${dir}/handler.py" "${build}/"
  if [[ -f "${shared}" ]] && grep -q openai_client "${dir}/handler.py" 2>/dev/null; then
    cp "${shared}" "${build}/"
  fi
  if [[ -f "${firestore_shared}" ]] && grep -q firestore_client "${dir}/handler.py" 2>/dev/null; then
    cp "${firestore_shared}" "${build}/"
  fi
  if [[ "${name}" == "audio-extractor" || "${name}" == "clip-generator" ]]; then
    local ffmpeg_bin="${build}/ffmpeg"
    local ffmpeg_cache="${dir}/vendor/ffmpeg"
    mkdir -p "${dir}/vendor"
    if [[ -f "${ffmpeg_cache}" ]]; then
      cp "${ffmpeg_cache}" "${ffmpeg_bin}"
      chmod +x "${ffmpeg_bin}"
      echo "    Using cached ffmpeg"
    elif [[ ! -f "${ffmpeg_bin}" ]]; then
      echo "    Downloading static ffmpeg for Lambda..."
      local ffmpeg_tmp="${dir}/.ffmpeg-dl"
      local ffmpeg_archive="${ffmpeg_tmp}/ffmpeg.tar.xz"
      rm -rf "${ffmpeg_tmp}" && mkdir -p "${ffmpeg_tmp}"
      curl -fsSL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" \
        -o "${ffmpeg_archive}"
      tar -xJf "${ffmpeg_archive}" -C "${ffmpeg_tmp}"
      local extracted
      extracted=$(find "${ffmpeg_tmp}" -name ffmpeg -type f ! -path "*/doc/*" | head -1)
      if [[ -z "${extracted}" || ! -f "${extracted}" ]]; then
        echo "ERROR: ffmpeg binary not found after extraction for ${name}"
        exit 1
      fi
      cp "${extracted}" "${ffmpeg_cache}"
      cp "${extracted}" "${ffmpeg_bin}"
      chmod +x "${ffmpeg_cache}" "${ffmpeg_bin}"
      rm -rf "${ffmpeg_tmp}"
    fi
    if [[ ! -f "${ffmpeg_bin}" ]]; then
      echo "ERROR: ffmpeg missing from ${name} build"
      exit 1
    fi
  fi
  rm -f "${dir}/${name}.zip"
  (cd "${build}" && zip -q -r "${dir}/${name}.zip" .)
  if [[ "${name}" == "audio-extractor" || "${name}" == "clip-generator" ]]; then
    if ! unzip -l "${dir}/${name}.zip" | grep -qE '(^|/)ffmpeg$'; then
      echo "ERROR: ffmpeg not packaged in ${name}.zip"
      exit 1
    fi
    echo "    ✓ ffmpeg verified in ${name}.zip"
  fi
}

verify_lambda_env() {
  echo ""
  echo "━━━ Verifying Lambda credentials ━━━"
  local fn key_present secret_present
  for entry in \
    "upload-trigger:FIREBASE_SECRET_ARN" \
    "notification-service:FIREBASE_SECRET_ARN" \
    "clip-download:FIREBASE_SECRET_ARN" \
    "audio-extractor:UPLOADS_BUCKET" \
    "ai-analyzer:OPENAI_API_KEY" \
    "whisper-transcriber:OPENAI_API_KEY" \
    "thumbnail-generator:OPENAI_API_KEY"; do
    fn="${entry%%:*}"
    key_present="${entry##*:}"
    secret_present=$(aws lambda get-function-configuration \
      --function-name "${PREFIX}-${fn}" \
      --region "${REGION}" \
      --query "Environment.Variables.${key_present}" \
      --output text 2>/dev/null || echo "MISSING")
    if [[ -z "${secret_present}" || "${secret_present}" == "None" || "${secret_present}" == "MISSING" ]]; then
      echo "  ✗ ${PREFIX}-${fn}: ${key_present} NOT SET"
    else
      echo "  ✓ ${PREFIX}-${fn}: ${key_present} set"
    fi
  done
}

build_and_zip_lambdas() {
  echo ""
  echo "━━━ Building Lambda packages ━━━"
  cd "${ROOT}"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm --filter @acf/upload-url build
  pnpm --filter @acf/upload-trigger build
  pnpm --filter @acf/notification-service build
  pnpm --filter @acf/clip-download build
  pnpm --filter @acf/transcript-chunker build

  (cd "${ROOT}/services/upload-url/dist" && zip -q -j "${ROOT}/services/upload-url/upload-url.zip" index.js)
  (cd "${ROOT}/services/upload-trigger/dist" && zip -q -j "${ROOT}/services/upload-trigger/upload-trigger.zip" index.js)
  (cd "${ROOT}/services/notification-service/dist" && zip -q -j "${ROOT}/services/notification-service/notification-service.zip" index.js)
  (cd "${ROOT}/services/clip-download/dist" && zip -q -j "${ROOT}/services/clip-download/clip-download.zip" index.js)
  (cd "${ROOT}/services/transcript-chunker/dist" && zip -q -j "${ROOT}/services/transcript-chunker/transcript-chunker.zip" index.js)

  echo "  Packaging Python Lambdas..."
  for py_fn in audio-extractor whisper-transcriber ai-analyzer clip-generator caption-generator thumbnail-generator; do
    if [[ -d "${ROOT}/services/${py_fn}" ]]; then
      package_python_lambda "${py_fn}" 2>/dev/null || true
    fi
  done
}

echo "AI Clip Finder — Staging Infrastructure"
echo "Region: ${REGION} | Profile: ${AWS_PROFILE} | Prefix: ${PREFIX}"

ensure_firebase_secret
ensure_openai_secret
export OPENAI_API_KEY

# 1. Storage
deploy_stack "${PREFIX}-storage" "${DIR}/templates/01-storage.yaml" \
  "Environment=${ENV}" \
  "ProjectPrefix=${PREFIX}" \
  "UploadTriggerLambdaArn=" \
  "CorsAllowOrigin=${CORS_ORIGIN}"

UPLOADS_BUCKET=$(get_output "${PREFIX}-storage" UploadsBucketName)
UPLOADS_ARN=$(get_output "${PREFIX}-storage" UploadsBucketArn)
PROCESSING_BUCKET=$(get_output "${PREFIX}-storage" ProcessingBucketName)
PROCESSING_ARN=$(get_output "${PREFIX}-storage" ProcessingBucketArn)

# 2. IAM
deploy_stack "${PREFIX}-iam" "${DIR}/templates/02-iam.yaml" \
  "ProjectPrefix=${PREFIX}" \
  "UploadsBucketArn=${UPLOADS_ARN}" \
  "ProcessingBucketArn=${PROCESSING_ARN}" \
  "FirebaseSecretArn=${FIREBASE_SECRET_ARN}"

LAMBDA_ROLE=$(get_output "${PREFIX}-iam" LambdaExecutionRoleArn)

# 3. Pipeline Lambdas
deploy_stack "${PREFIX}-lambdas-pipeline" "${DIR}/templates/03-lambdas-pipeline.yaml" \
  "ProjectPrefix=${PREFIX}" \
  "Environment=${ENV}" \
  "FirebaseProjectId=${FIREBASE_PROJECT}" \
  "LambdaExecutionRoleArn=${LAMBDA_ROLE}" \
  "UploadsBucketName=${UPLOADS_BUCKET}" \
  "ProcessingBucketName=${PROCESSING_BUCKET}" \
  "FirebaseSecretArn=${FIREBASE_SECRET_ARN}" \
  "OpenAISecretArn=${OPENAI_SECRET_ARN:-}"

TRIGGER_ARN=$(get_output "${PREFIX}-lambdas-pipeline" UploadTriggerLambdaArn)
AUDIO_ARN=$(get_output "${PREFIX}-lambdas-pipeline" AudioExtractorLambdaArn)
AI_ARN=$(get_output "${PREFIX}-lambdas-pipeline" AIAnalyzerLambdaArn)
WHISPER_ARN=$(get_output "${PREFIX}-lambdas-pipeline" WhisperTranscriberLambdaArn)
CHUNKER_ARN=$(get_output "${PREFIX}-lambdas-pipeline" TranscriptChunkerLambdaArn)
CLIP_GEN_ARN=$(get_output "${PREFIX}-lambdas-pipeline" ClipGeneratorLambdaArn)

# 4. Wire S3 upload trigger + CORS (update storage stack with Lambda ARN)
deploy_stack "${PREFIX}-storage" "${DIR}/templates/01-storage.yaml" \
  "Environment=${ENV}" \
  "ProjectPrefix=${PREFIX}" \
  "UploadTriggerLambdaArn=${TRIGGER_ARN}" \
  "CorsAllowOrigin=${CORS_ORIGIN}"

# 5. API Lambdas
deploy_stack "${PREFIX}-lambdas-api" "${DIR}/templates/04-lambdas-api.yaml" \
  "ProjectPrefix=${PREFIX}" \
  "Environment=${ENV}" \
  "FirebaseProjectId=${FIREBASE_PROJECT}" \
  "LambdaExecutionRoleArn=${LAMBDA_ROLE}" \
  "UploadsBucketName=${UPLOADS_BUCKET}" \
  "ProcessingBucketName=${PROCESSING_BUCKET}" \
  "FirebaseSecretArn=${FIREBASE_SECRET_ARN}"

UPLOAD_URL_ARN=$(get_output "${PREFIX}-lambdas-api" UploadUrlLambdaArn)
VIDEOS_LIST_ARN=$(get_output "${PREFIX}-lambdas-api" VideosListLambdaArn)
VIDEO_GET_ARN=$(get_output "${PREFIX}-lambdas-api" VideoGetLambdaArn)
VIDEO_CLIPS_ARN=$(get_output "${PREFIX}-lambdas-api" VideoClipsLambdaArn)
VIDEO_TRANSCRIPT_ARN=$(get_output "${PREFIX}-lambdas-api" VideoTranscriptLambdaArn)
VIDEO_REGEN_ARN=$(get_output "${PREFIX}-lambdas-api" VideoRegenerateLambdaArn)
VIDEO_DELETE_ARN=$(get_output "${PREFIX}-lambdas-api" VideoDeleteLambdaArn)
CLIP_DOWNLOAD_ARN=$(get_output "${PREFIX}-lambdas-api" ClipDownloadLambdaArn)

# 6. API Gateway
deploy_stack "${PREFIX}-api" "${DIR}/templates/05-api-gateway.yaml" \
  "ProjectPrefix=${PREFIX}" \
  "Environment=${ENV}" \
  "UploadUrlLambdaArn=${UPLOAD_URL_ARN}" \
  "VideosListLambdaArn=${VIDEOS_LIST_ARN}" \
  "VideoGetLambdaArn=${VIDEO_GET_ARN}" \
  "VideoClipsLambdaArn=${VIDEO_CLIPS_ARN}" \
  "VideoTranscriptLambdaArn=${VIDEO_TRANSCRIPT_ARN}" \
  "VideoRegenerateLambdaArn=${VIDEO_REGEN_ARN}" \
  "VideoDeleteLambdaArn=${VIDEO_DELETE_ARN}" \
  "ClipDownloadLambdaArn=${CLIP_DOWNLOAD_ARN}" \
  "AudioExtractorLambdaArn=${AUDIO_ARN}" \
  "AIAnalyzerLambdaArn=${AI_ARN}" \
  "WhisperTranscriberLambdaArn=${WHISPER_ARN}" \
  "TranscriptChunkerLambdaArn=${CHUNKER_ARN}" \
  "ClipGeneratorLambdaArn=${CLIP_GEN_ARN}" \
  "CorsAllowOrigin=${CORS_ORIGIN}"

API_ENDPOINT=$(get_output "${PREFIX}-api" ApiEndpoint)

# 7. Deploy real Lambda code
build_and_zip_lambdas
deploy_lambda_zip "${PREFIX}-upload-url" "${ROOT}/services/upload-url/upload-url.zip"
deploy_lambda_zip "${PREFIX}-upload-trigger" "${ROOT}/services/upload-trigger/upload-trigger.zip"
deploy_lambda_zip "${PREFIX}-notification-service" "${ROOT}/services/notification-service/notification-service.zip"
deploy_lambda_zip "${PREFIX}-clip-download" "${ROOT}/services/clip-download/clip-download.zip"
deploy_lambda_zip "${PREFIX}-transcript-chunker" "${ROOT}/services/transcript-chunker/transcript-chunker.zip"

echo ""
echo "━━━ Deploying Python Lambda code ━━━"
for py_fn in audio-extractor whisper-transcriber ai-analyzer clip-generator caption-generator thumbnail-generator; do
  zip_path="${ROOT}/services/${py_fn}/${py_fn}.zip"
  if [[ -f "${zip_path}" ]]; then
    deploy_lambda_zip "${PREFIX}-${py_fn}" "${zip_path}"
  else
    echo "  ⚠ Skipping ${py_fn} — zip not found"
  fi
done

wire_openai_env_to_lambdas
verify_lambda_env

echo ""
echo "OpenAI Secret:      ${OPENAI_SECRET_ARN:-not configured}"
echo "━━━ Deployment Complete ━━━"
echo "API Endpoint:       ${API_ENDPOINT}"
echo "Uploads Bucket:     ${UPLOADS_BUCKET}"
echo "Processing Bucket:  ${PROCESSING_BUCKET}"
echo "Firebase Secret:    ${FIREBASE_SECRET_ARN}"
echo ""
echo "Set in apps/web/.env.local:"
echo "  NEXT_PUBLIC_API_URL=${API_ENDPOINT}"
