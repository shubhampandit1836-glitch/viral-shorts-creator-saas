# Database Schema (Firestore)

## users
| Field | Type |
|-------|------|
| uid | string |
| name | string |
| email | string |
| photoURL | string? |
| plan | free \| pro \| enterprise |
| credits | number |
| createdAt | timestamp |

## videos
| Field | Type |
|-------|------|
| id | string |
| userId | string |
| title | string |
| s3Key | string |
| duration | number? |
| status | VideoStatus |
| thumbnail | string? |
| uploadedAt | timestamp |
| processingStarted | timestamp? |
| completedAt | timestamp? |
| creditsUsed | number? |

## jobs
| Field | Type |
|-------|------|
| id | string |
| videoId | string |
| status | VideoStatus |
| currentStep | string |
| progress | number (0-100) |
| startedAt | timestamp |
| completedAt | timestamp? |
| logs | JobLog[] |

## transcripts
Document ID = videoId

## clips
Subcollection or top-level with videoId index

## Security Rules

Only the video owner (`userId`) can read/write their videos, clips, and transcripts.
