# CloudFormation — Modular Staging Stacks

Deploy everything:

```bash
./infra/cloudformation/staging/deploy.sh
```

## Template Layout

| File | Stack Name | What it manages |
|------|-----------|-----------------|
| `templates/01-storage.yaml` | `acf-staging-storage` | 2 S3 buckets (uploads + processing) |
| `templates/02-iam.yaml` | `acf-staging-iam` | Lambda execution role |
| `templates/03-lambdas-pipeline.yaml` | `acf-staging-lambdas-pipeline` | Pipeline Lambdas + S3 trigger permission |
| `templates/04-lambdas-api.yaml` | `acf-staging-lambdas-api` | Frontend API Lambdas |
| `templates/05-api-gateway.yaml` | `acf-staging-api` | API Gateway routes |

`main.yaml` is a reference doc only — deploy via `deploy.sh`.

## Architecture (matches Pinpole diagram)

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    └────────┬────────┘
         ┌───────────────────┼───────────────────┐
         │                   │                   │
   POST /upload-url    ANY /audio-extractor  ANY /ai-analyzer
         │                   │                   │
         ▼                   ▼                   ▼
   upload-url         audio-extractor       ai-analyzer
         │                   │                   │
         ▼                   └─────────┬─────────┘
  Video Upload Bucket                  │
  (acf-staging-uploads)                ▼
         │                    Processing Bucket
         │ S3 event           (acf-staging-processing)
         ▼                    audio/ clips/ captions/
  upload-trigger              transcripts/ thumbnails/
         │
         └──► audio-extractor → whisper → chunker → ai-analyzer
              → clip-generator → caption + thumbnail → notification
```

## API Routes

### Frontend
| Method | Path | Lambda |
|--------|------|--------|
| POST | `/upload-url` | upload-url |
| GET | `/videos` | videos-list |
| GET | `/video/{id}` | video-get |
| GET | `/video/{id}/clips` | video-clips |
| GET | `/video/{id}/transcript` | video-transcript |
| POST | `/video/{id}/regenerate` | video-regenerate |
| POST | `/video/{id}/delete` | video-delete |
| POST | `/clip/{id}/download` | clip-download |

### Pipeline (direct invoke — like Pinpole diagram)
| Method | Path | Lambda |
|--------|------|--------|
| ANY | `/audio-extractor` | audio-extractor |
| ANY | `/ai-analyzer` | ai-analyzer |
| ANY | `/whisper-transcriber` | whisper-transcriber |
| ANY | `/transcript-chunker` | transcript-chunker |
| ANY | `/clip-generator` | clip-generator |

## Deploy a single stack

```bash
aws cloudformation deploy \
  --stack-name acf-staging-storage \
  --template-file infra/cloudformation/staging/templates/01-storage.yaml \
  --parameter-overrides Environment=staging ProjectPrefix=acf-staging \
  --region us-east-1
```

## Pinpole

[View architecture canvas](https://app.pinpole.cloud/canvas?project=WxSBNN5bGbQ1FCXBlHdT)
