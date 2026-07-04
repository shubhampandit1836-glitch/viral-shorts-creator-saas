# AI Clip Finder

SaaS platform that turns long-form videos into viral clips using AI.

## Architecture

- **Frontend**: Next.js 16, TailwindCSS, Claude-inspired UI
- **Auth**: Firebase Authentication (email + Google)
- **Database**: Firestore (realtime listeners)
- **Storage**: Amazon S3 (direct upload via presigned URLs)
- **Processing**: Serverless Lambda pipeline with SQS + EventBridge
- **Infrastructure**: Modular AWS CloudFormation (`infra/cloudformation/staging/templates/`)

View the architecture diagram in [Pinpole](https://app.pinpole.cloud/canvas?project=WxSBNN5bGbQ1FCXBlHdT&workspace=jRnmqivu4wnSQfPucGWS).

## Monorepo Structure

```
ai-clip-finder/
├── apps/web/              # Next.js frontend
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Utilities (credits, scoring)
│   ├── prompts/           # LLM prompts
│   └── ui/                # Shared UI components
├── services/              # Lambda functions
├── infra/cloudformation/  # Modular CloudFormation stacks
│   └── staging/
│       ├── deploy.sh          # deploy all stacks
│       └── templates/         # 01-storage → 05-api-gateway
└── docs/                  # Documentation
```

## Getting Started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Fill in Firebase credentials
pnpm dev
```

## Deploy Infrastructure

```bash
chmod +x infra/cloudformation/staging/deploy.sh
./infra/cloudformation/staging/deploy.sh
```

## Pipeline Flow

1. User uploads video directly to S3 via presigned URL
2. S3 event triggers `upload-trigger` → audio queue
3. `audio-extractor` → FFmpeg → audio.wav → transcription queue
4. `whisper-transcriber` → OpenAI Whisper → chunking queue
5. `transcript-chunker` → semantic chunks → analysis queue
6. `ai-analyzer` → LLM scoring → clip queue
7. `clip-generator` → FFmpeg clips → caption + thumbnail queues
8. `caption-generator` → SRT/VTT → notification queue
9. `notification-service` → Firestore status update
