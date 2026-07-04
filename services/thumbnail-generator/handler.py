"""Generate AI thumbnail ideas."""
import json
import os
import boto3
from openai_client import get_openai_client

s3 = boto3.client("s3")
PROCESSING_BUCKET = os.environ["PROCESSING_BUCKET"]


def lambda_handler(event, context):
    client = get_openai_client()
    records = event.get("Records", [event])
    for record in records:
        body = json.loads(record["body"]) if "body" in record else record
        video_id = body["videoId"]
        clip_id = body.get("clipId", "clip-0")
        title = body.get("title", "")
        hook = body.get("hook", "")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"Generate 3 thumbnail ideas as JSON array with color, text, emotion fields.\nTitle: {title}\nHook: {hook}",
            }],
            response_format={"type": "json_object"},
        )

        ideas = json.loads(response.choices[0].message.content)
        key = f"thumbnails/{video_id}/{clip_id}/ideas.json"
        s3.put_object(
            Bucket=PROCESSING_BUCKET,
            Key=key,
            Body=json.dumps(ideas),
            ContentType="application/json",
        )

    return {"statusCode": 200}
