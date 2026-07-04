"""AI analysis of transcript chunks using LLM."""
import json
import os

import boto3
from openai_client import get_openai_client
from firestore_client import (
    append_job_log,
    update_video_status,
    save_clip_doc,
    _now_iso,
)

lambda_client = boto3.client("lambda")
NOTIFICATION_FUNCTION = os.environ.get("NOTIFICATION_FUNCTION", "")

ANALYSIS_PROMPT = """Analyze this transcript chunk from a video. Return JSON with:
viralityScore, emotionScore, hookScore, curiosityScore, educationalValue, engagementScore,
topic, keywords (array), bestQuote, bestClipStart (seconds), bestClipEnd (seconds),
suggestedTitle, suggestedCaption, suggestedHook, suggestedThumbnailText (all scores 0-100)."""


def compute_overall(scores: dict) -> int:
    return round(
        scores.get("viralityScore", 0) * 0.4
        + scores.get("emotionScore", 0) * 0.2
        + scores.get("hookScore", 0) * 0.2
        + scores.get("curiosityScore", 0) * 0.1
        + scores.get("engagementScore", 0) * 0.1
    )


def lambda_handler(event, context):
    records = event.get("Records", [event])
    for record in records:
        body = json.loads(record["body"]) if "body" in record else record
        chunk = body["chunk"]
        video_id = body["videoId"]
        job_id = body.get("jobId")
        user_id = body.get("userId")
        chunk_id = body.get("chunkId", "chunk-0")
        chunk_index = int(body.get("chunkIndex", 0))
        total_chunks = int(body.get("totalChunks", 1))

        try:
            client = get_openai_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": ANALYSIS_PROMPT},
                    {
                        "role": "user",
                        "content": f"Chunk time range {chunk['start']:.1f}s–{chunk['end']:.1f}s:\n{chunk['text']}",
                    },
                ],
                response_format={"type": "json_object"},
            )

            analysis = json.loads(response.choices[0].message.content)
            analysis["overallScore"] = compute_overall(analysis)

            chunk_start = float(chunk["start"])
            chunk_end = float(chunk["end"])
            ai_start = float(analysis.get("bestClipStart", chunk_start))
            ai_end = float(analysis.get("bestClipEnd", chunk_end))
            start = max(chunk_start, min(ai_start, chunk_end - 3))
            end = min(chunk_end, max(ai_end, start + 3))
            if end - start < 3:
                start, end = chunk_start, chunk_end

            clip_doc_id = f"{video_id}-{chunk_id}"
            save_clip_doc(
                clip_doc_id,
                {
                    "id": clip_doc_id,
                    "videoId": video_id,
                    "userId": user_id,
                    "title": analysis.get("suggestedTitle", f"Clip {chunk_index + 1}"),
                    "caption": analysis.get("suggestedCaption", ""),
                    "hook": analysis.get("suggestedHook", ""),
                    "topic": analysis.get("topic", ""),
                    "keywords": analysis.get("keywords", []),
                    "start": start,
                    "end": end,
                    "aspectRatio": "9:16",
                    "score": {
                        "virality": analysis.get("viralityScore", 0),
                        "emotion": analysis.get("emotionScore", 0),
                        "hook": analysis.get("hookScore", 0),
                        "curiosity": analysis.get("curiosityScore", 0),
                        "educationalValue": analysis.get("educationalValue", 0),
                        "engagement": analysis.get("engagementScore", 0),
                        "overall": analysis.get("overallScore", 0),
                    },
                },
            )

            progress = 50 + int(((chunk_index + 1) / max(total_chunks, 1)) * 45)
            if job_id:
                append_job_log(
                    job_id,
                    "analyzing",
                    f"Analyzed clip {chunk_index + 1}/{total_chunks}: {analysis.get('suggestedTitle', chunk_id)}",
                    min(progress, 95),
                    "analyzing",
                )

            if chunk_index + 1 >= total_chunks:
                update_video_status(video_id, "completed", completedAt=_now_iso())
                if job_id:
                    append_job_log(job_id, "completed", f"Generated {total_chunks} clip(s)", 100, "completed")
                if NOTIFICATION_FUNCTION:
                    lambda_client.invoke(
                        FunctionName=NOTIFICATION_FUNCTION,
                        InvocationType="Event",
                        Payload=json.dumps({"videoId": video_id, "jobId": job_id, "userId": user_id}),
                    )

        except Exception as err:
            msg = str(err)[:500]
            update_video_status(video_id, "failed", error=msg)
            if job_id:
                append_job_log(job_id, "failed", msg, 0, "failed")
            return {"statusCode": 500, "error": msg}

    return {"statusCode": 200}
