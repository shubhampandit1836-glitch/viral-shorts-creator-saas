export type UserPlan = "free" | "starter" | "pro" | "premium";

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  plan: UserPlan;
  credits: number;
  creditsUsed?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export type VideoStatus =
  | "uploading"
  | "uploaded"
  | "extracting_audio"
  | "transcribing"
  | "analyzing"
  | "generating_clips"
  | "generating_captions"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Video {
  id: string;
  userId: string;
  title: string;
  s3Key: string;
  localFileName?: string;
  localFilePath?: string;
  duration?: number;
  status: VideoStatus;
  thumbnail?: string;
  uploadedAt: string;
  processingStarted?: string;
  completedAt?: string;
  creditsUsed?: number;
  error?: string;
}

export interface JobLog {
  step: string;
  message: string;
  timestamp: string;
}

export interface Job {
  id: string;
  videoId: string;
  userId?: string;
  status: VideoStatus;
  currentStep: string;
  progress: number;
  startedAt: string;
  completedAt?: string;
  logs: JobLog[];
}

export interface TranscriptWord {
  start: number;
  end: number;
  word: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

export interface Transcript {
  videoId: string;
  text: string;
  segments: TranscriptSegment[];
  language?: string;
  createdAt: string;
}

export interface ClipScores {
  virality: number;
  emotion: number;
  hook: number;
  curiosity: number;
  educationalValue: number;
  engagement: number;
  overall: number;
}

export interface Clip {
  id: string;
  videoId: string;
  title: string;
  caption: string;
  hook: string;
  score: ClipScores;
  start: number;
  end: number;
  s3Key?: string;
  portraitS3Key?: string;
  thumbnail?: string;
  topic?: string;
  keywords?: string[];
  aspectRatio?: "9:16" | "16:9";
  createdAt: string;
}

export interface AIAnalysis {
  videoId: string;
  chunkId: string;
  scores: ClipScores;
  topic: string;
  keywords: string[];
  bestQuote: string;
  bestClipStart: number;
  bestClipEnd: number;
  suggestedTitle: string;
  suggestedCaption: string;
  suggestedHook: string;
  suggestedThumbnailText: string;
}

export interface UploadUrlResponse {
  uploadURL: string;
  videoKey: string;
  jobId: string;
}

export interface CreditTier {
  maxMinutes: number;
  credits: number;
}
