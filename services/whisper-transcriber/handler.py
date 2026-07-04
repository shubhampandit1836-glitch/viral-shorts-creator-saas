"""Transcribe audio using OpenAI Whisper API."""
import json
import os
import tempfile

import boto3
from openai_client import get_openai_client
from firestore_client import append_job_log, update_video_status, get_db

s3 = boto3.client("s3")
lambda_client = boto3.client("lambda")

PROCESSING_BUCKET = os.environ["PROCESSING_BUCKET"]
TRANSCRIPT_CHUNKER_FUNCTION = os.environ["TRANSCRIPT_CHUNKER_FUNCTION"]


def save_transcript_to_firestore(video_id: str, user_id: str | None, transcript: dict):
    db = get_db()
    db.collection("transcripts").document(video_id).set(
        {
            "videoId": video_id,
            "userId": user_id,
            "text": transcript["text"],
            "segments": transcript["segments"],
            "updatedAt": transcript.get("updatedAt"),
        },
        merge=True,
    )


def lambda_handler(event, context):
    records = event.get("Records", [event])
    for record in records:
        body = json.loads(record["body"]) if "body" in record else record
        video_id = body["videoId"]
        job_id = body.get("jobId")
        user_id = body.get("userId")
        audio_key = body["audioKey"]

        try:
            if job_id:
                append_job_log(job_id, "transcribing", "Calling OpenAI Whisper", 35, "transcribing")

            client = get_openai_client()

            with tempfile.NamedTemporaryFile(suffix=".wav") as f:
                s3.download_file(PROCESSING_BUCKET, audio_key, f.name)
                with open(f.name, "rb") as audio_file:
                    response = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",
                        timestamp_granularities=["word", "segment"],
                    )

            transcript = {
                "text": response.text,
                "segments": [
                    {
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text,
                        "words": [
                            {"start": w.start, "end": w.end, "word": w.word}
                            for w in (getattr(seg, "words", None) or [])
                        ],
                    }
                    for seg in (response.segments or [])
                ],
            }

            transcript_key = f"transcripts/{video_id}/transcript.json"
            s3.put_object(
                Bucket=PROCESSING_BUCKET,
                Key=transcript_key,
                Body=json.dumps(transcript),
                ContentType="application/json",
            )

            save_transcript_to_firestore(video_id, user_id, transcript)

            if job_id:
                append_job_log(
                    job_id,
                    "transcribing",
                    f"Transcript saved ({len(transcript['segments'])} segments)",
                    45,
                    "transcribing",
                )

            update_video_status(video_id, "analyzing")

            payload = {**body, "transcriptKey": transcript_key, "transcript": transcript}
            lambda_client.invoke(
                FunctionName=TRANSCRIPT_CHUNKER_FUNCTION,
                InvocationType="Event",
                Payload=json.dumps(payload),
            )

            if job_id:
                append_job_log(job_id, "analyzing", "Starting AI analysis", 50, "analyzing")

        except Exception as err:
            msg = str(err)[:500]
            update_video_status(video_id, "failed", error=msg)
            if job_id:
                append_job_log(job_id, "failed", msg, 0, "failed")
            return {"statusCode": 500, "error": msg}

    return {"statusCode": 200}
