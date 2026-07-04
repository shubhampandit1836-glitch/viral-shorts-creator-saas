"""Extract audio from uploaded video using FFmpeg."""
import json
import os
import subprocess
import tempfile
from urllib.parse import unquote

import boto3
from botocore.exceptions import ClientError

from firestore_client import append_job_log, update_video_status

s3 = boto3.client("s3")
lambda_client = boto3.client("lambda")

UPLOADS_BUCKET = os.environ["UPLOADS_BUCKET"]
PROCESSING_BUCKET = os.environ["PROCESSING_BUCKET"]
WHISPER_TRANSCRIBER_FUNCTION = os.environ["WHISPER_TRANSCRIBER_FUNCTION"]
FFMPEG = os.environ.get("FFMPEG_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg"))


def resolve_s3_key(bucket: str, key: str, video_id: str, user_id: str | None = None) -> str:
    """Normalize key and verify object exists; fall back to prefix listing."""
    candidates: list[str] = []
    if key:
        candidates.append(unquote(key.replace("+", " ")))
    if user_id:
        prefix = f"uploads/{user_id}/{video_id}/"
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        for obj in resp.get("Contents", []):
            candidates.append(obj["Key"])

    seen = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        try:
            s3.head_object(Bucket=bucket, Key=candidate)
            return candidate
        except ClientError as err:
            if err.response["Error"]["Code"] not in ("404", "NoSuchKey"):
                raise
    raise FileNotFoundError(f"No S3 object found for video {video_id} in bucket {bucket}")


def lambda_handler(event, context):
    records = event.get("Records", [event])
    for record in records:
        body = json.loads(record["body"]) if "body" in record else record
        bucket = body.get("bucket", UPLOADS_BUCKET)
        raw_key = body.get("key") or body.get("s3Key", "")
        video_id = body["videoId"]
        job_id = body["jobId"]
        user_id = body.get("userId")

        if not os.path.isfile(FFMPEG):
            msg = f"ffmpeg not found at {FFMPEG}"
            update_video_status(video_id, "failed", error=msg)
            append_job_log(job_id, "failed", msg, 0, "failed")
            return {"statusCode": 500, "error": msg}

        try:
            key = resolve_s3_key(bucket, raw_key, video_id, user_id)
            append_job_log(job_id, "extracting_audio", f"Downloading {key}", 15, "extracting_audio")

            with tempfile.TemporaryDirectory() as tmp:
                video_path = os.path.join(tmp, "video.mp4")
                audio_path = os.path.join(tmp, "audio.wav")
                s3.download_file(bucket, key, video_path)

                append_job_log(job_id, "extracting_audio", "Running ffmpeg", 20)

                result = subprocess.run(
                    [FFMPEG, "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", audio_path],
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    raise RuntimeError(f"ffmpeg failed: {result.stderr[-2000:]}")

                audio_key = f"audio/{video_id}/audio.wav"
                s3.upload_file(audio_path, PROCESSING_BUCKET, audio_key)

            update_video_status(video_id, "transcribing", s3Key=key)
            append_job_log(job_id, "transcribing", "Audio extracted, starting transcription", 30, "transcribing")

            payload = {**body, "key": key, "audioKey": audio_key, "processingBucket": PROCESSING_BUCKET}
            lambda_client.invoke(
                FunctionName=WHISPER_TRANSCRIBER_FUNCTION,
                InvocationType="Event",
                Payload=json.dumps(payload),
            )
        except Exception as err:
            msg = str(err)[:500]
            update_video_status(video_id, "failed", error=msg)
            append_job_log(job_id, "failed", msg, 0, "failed")
            return {"statusCode": 500, "error": msg}

    return {"statusCode": 200}
