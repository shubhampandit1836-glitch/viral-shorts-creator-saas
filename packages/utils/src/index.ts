import type { ClipScores, CreditTier, UserPlan } from "@acf/types";

export const CREDIT_TIERS: CreditTier[] = [
  { maxMinutes: 10, credits: 5 },
  { maxMinutes: 30, credits: 15 },
  { maxMinutes: 60, credits: 30 },
];

export interface PlanDefinition {
  id: UserPlan;
  name: string;
  price: number;
  priceLabel: string;
  monthlyCredits: number;
  maxVideosPerMonth: number | null;
  features: string[];
  stripePriceEnvKey?: string;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    monthlyCredits: 50,
    maxVideosPerMonth: 5,
    features: ["50 credits/month", "5 videos", "Basic clips", "Whisper transcription"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    priceLabel: "$9",
    monthlyCredits: 150,
    maxVideosPerMonth: 15,
    features: ["150 credits/month", "15 videos", "9:16 reels", "AI titles & captions"],
    stripePriceEnvKey: "STARTER_STRIPE_PRICE_ID",
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    priceLabel: "$19",
    monthlyCredits: 400,
    maxVideosPerMonth: 50,
    features: ["400 credits/month", "50 videos", "Priority processing", "Analytics dashboard"],
    stripePriceEnvKey: "PRO_STRIPE_PRICE_ID",
  },
  {
    id: "premium",
    name: "Premium",
    price: 29,
    priceLabel: "$29",
    monthlyCredits: 1000,
    maxVideosPerMonth: null,
    features: ["1,000 credits/month", "Unlimited videos", "HD clips", "Dedicated support"],
    stripePriceEnvKey: "PREMIUM_STRIPE_PRICE_ID",
  },
];

export function getPlan(planId: UserPlan): PlanDefinition {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0];
}

export function calculateCredits(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  if (minutes <= 10) return 5;
  if (minutes <= 30) return 15;
  if (minutes <= 60) return 30;
  return Math.ceil(minutes / 2);
}

export function computeOverallScore(scores: Omit<ClipScores, "overall">): number {
  const overall =
    scores.virality * 0.4 +
    scores.emotion * 0.2 +
    scores.hook * 0.2 +
    scores.curiosity * 0.1 +
    scores.engagement * 0.1;
  return Math.round(overall);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatRelativeDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

export const PIPELINE_STEPS = [
  "uploading",
  "uploaded",
  "extracting_audio",
  "transcribing",
  "analyzing",
  "generating_clips",
  "generating_captions",
  "finalizing",
  "completed",
] as const;
