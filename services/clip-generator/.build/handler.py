"""Generate clip videos in portrait and landscape formats."""
import json
import os
import subprocess
import tempfile
import boto3

s3 = boto3.client("s3")
lambda_client = boto3.client("lambda")

UPLOADS_BUCKET = os.environ["UPLOADS_BUCKET"]
PROCESSING_BUCKET = os.environ["PROCESSING_BUCKET"]
CAPTION_GENERATOR_FUNCTION = os.environ["CAPTION_GENERATOR_FUNCTION"]
THUMBNAIL_GENERATOR_FUNCTION = os.environ["THUMBNAIL_GENERATOR_FUNCTION"]


def lambda_handler(event, context):
    records = event.get("Records", [event])
    for record in records:
        body = json.loads(record["body"]) if "body" in record else record
        analysis = body["analysis"]
        video_id = body["videoId"]
        start = analysis["bestClipStart"]
        end = analysis["bestClipEnd"]
        clip_id = body.get("chunkId", "clip-0")
        source_bucket = body.get("bucket", UPLOADS_BUCKET)
        source_key = body["key"]

        with tempfile.TemporaryDirectory() as tmp:
            video_path = os.path.join(tmp, "source.mp4")
            portrait_path = os.path.join(tmp, "portrait.mp4")
            landscape_path = os.path.join(tmp, "landscape.mp4")

            s3.download_file(source_bucket, source_key, video_path)

            for output, vf in [(portrait_path, "scale=1080:1920"), (landscape_path, "scale=1920:1080")]:
                subprocess.run(
                    [
                        "ffmpeg", "-ss", str(start), "-to", str(end),
                        "-i", video_path, "-vf", vf, "-c:v", "libx264", "-c:a", "aac", output,
                    ],
                    check=True,
                    capture_output=True,
                )

            portrait_key = f"clips/{video_id}/{clip_id}/portrait.mp4"
            landscape_key = f"clips/{video_id}/{clip_id}/landscape.mp4"
            s3.upload_file(portrait_path, PROCESSING_BUCKET, portrait_key)
            s3.upload_file(landscape_path, PROCESSING_BUCKET, landscape_key)

        clip_data = {
            **body,
            "clipId": clip_id,
            "portraitKey": portrait_key,
            "landscapeKey": landscape_key,
            "title": analysis["suggestedTitle"],
            "caption": analysis["suggestedCaption"],
            "hook": analysis["suggestedHook"],
            "score": analysis,
            "processingBucket": PROCESSING_BUCKET,
        }

        lambda_client.invoke(
            FunctionName=CAPTION_GENERATOR_FUNCTION,
            InvocationType="Event",
            Payload=json.dumps(clip_data),
        )
        lambda_client.invoke(
            FunctionName=THUMBNAIL_GENERATOR_FUNCTION,
            InvocationType="Event",
            Payload=json.dumps(clip_data),
        )

    return {"statusCode": 200}
