# Architecture

## Overview

Simple, manageable architecture matching the Pinpole diagram:

- **API Gateway** → routes to Lambdas (frontend + direct pipeline access)
- **Video Upload Bucket** (S3) → triggers pipeline on upload
- **Processing Bucket** (S3) → all artifacts in folders
- **No SQS** — pipeline uses direct async Lambda invoke

## Pinpole Canvas

[Open in Pinpole](https://app.pinpole.cloud/canvas?project=WxSBNN5bGbQ1FCXBlHdT)

## CloudFormation (modular)

```
infra/cloudformation/staging/
├── deploy.sh                      # deploy all stacks in order
├── main.yaml                      # reference doc (do not deploy directly)
├── parameters.json
└── templates/
    ├── 01-storage.yaml            # 2 S3 buckets
    ├── 02-iam.yaml                # Lambda IAM role
    ├── 03-lambdas-pipeline.yaml   # Pipeline Lambdas
    ├── 04-lambdas-api.yaml        # Frontend API Lambdas
    └── 05-api-gateway.yaml        # API Gateway routes
```

## S3 Buckets

| Bucket | Folders / Purpose |
|--------|-------------------|
| `acf-staging-uploads` | `uploads/{userId}/{videoId}/` — triggers pipeline |
| `acf-staging-processing` | `audio/`, `transcripts/`, `clips/`, `captions/`, `thumbnails/`, `exports/` |

## Flow

1. Frontend calls `POST /upload-url` → presigned URL → direct upload to uploads bucket
2. S3 `ObjectCreated` → `upload-trigger` Lambda
3. Pipeline chain: audio-extractor → whisper → chunker → ai-analyzer → clip-generator → caption + thumbnail → notification
4. Each step also reachable via API Gateway (`ANY /audio-extractor`, etc.) for manual/debug triggers
5. Frontend reads metadata from Firestore (realtime listeners)
