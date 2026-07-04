# API Reference

Base URL: `https://{api-id}.execute-api.{region}.amazonaws.com/staging`

All endpoints require `Authorization: Bearer {firebase-id-token}` except where noted.

## POST /upload-url

Generate presigned S3 upload URL.

**Request:**
```json
{ "fileName": "podcast.mp4", "contentType": "video/mp4", "userId": "uid" }
```

**Response:**
```json
{ "uploadURL": "...", "videoKey": "...", "jobId": "...", "videoId": "..." }
```

## GET /videos

List user's videos.

## GET /video/:id

Get video details.

## GET /video/:id/clips

List generated clips for a video.

## GET /video/:id/transcript

Get transcript with word-level timestamps.

## POST /video/:id/regenerate

Re-run clip generation for a video.

## POST /video/:id/delete

Delete video and associated assets.

## POST /clip/:id/download

Get presigned download URL for a clip.
