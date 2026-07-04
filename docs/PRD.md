# AI Clip Finder — Product Requirements

See the full PRD in the project root conversation. Key features:

- Upload long-form videos (podcasts, interviews, webinars)
- Auto-generate viral clips, titles, captions, hooks, scores
- Credit-based pricing (5/15/30 credits for 10/30/60 min videos)
- Realtime Firestore status updates
- Direct S3 upload (no video through Next.js)

## Processing States

`uploading` → `uploaded` → `extracting_audio` → `transcribing` → `analyzing` → `generating_clips` → `generating_captions` → `finalizing` → `completed` | `failed`

## Score Weights

| Score | Weight |
|-------|--------|
| Virality | 40% |
| Emotion | 20% |
| Hook | 20% |
| Curiosity | 10% |
| Engagement | 10% |
