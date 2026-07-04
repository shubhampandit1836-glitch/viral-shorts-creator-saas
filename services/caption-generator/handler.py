"""Generate SRT caption files."""
import json
import os
import boto3

s3 = boto3.client("s3")
lambda_client = boto3.client("lambda")

PROCESSING_BUCKET = os.environ["PROCESSING_BUCKET"]
NOTIFICATION_FUNCTION = os.environ["NOTIFICATION_FUNCTION"]


def format_srt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def generate_srt(text, start, end):
    return f"1\n{format_srt_time(start)} --> {format_srt_time(end)}\n{text}\n"


def lambda_handler(event, context):
    records = event.get("Records", [event])
    for record in records:
        body = json.loads(record["body"]) if "body" in record else record
        video_id = body["videoId"]
        clip_id = body.get("clipId", "clip-0")
        analysis = body.get("analysis", body.get("score", {}))
        text = analysis.get("suggestedCaption", body.get("caption", ""))
        start = analysis.get("bestClipStart", 0)
        end = analysis.get("bestClipEnd", 30)

        srt_key = f"captions/{video_id}/{clip_id}/captions.srt"
        s3.put_object(
            Bucket=PROCESSING_BUCKET,
            Key=srt_key,
            Body=generate_srt(text, start, end),
            ContentType="text/plain",
        )

        payload = {**body, "captionKey": srt_key}
        lambda_client.invoke(
            FunctionName=NOTIFICATION_FUNCTION,
            InvocationType="Event",
            Payload=json.dumps(payload),
        )

    return {"statusCode": 200}
