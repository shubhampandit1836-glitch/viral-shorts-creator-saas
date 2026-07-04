"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, Loader2, X } from "lucide-react";
import { Button, Progress } from "@acf/ui";
import { PIPELINE_STEPS, statusLabel } from "@acf/utils";
import { cancelVideo, canCancelVideo } from "@/lib/videos";
import { VideoThumbnailPlayer } from "@/components/video-thumbnail-player";
import type { Video, Job } from "@acf/types";

const MINI_STEPS = ["uploaded", "transcribing", "analyzing", "generating_clips", "completed"] as const;

function stepIndex(step: string): number {
  const idx = MINI_STEPS.indexOf(step as (typeof MINI_STEPS)[number]);
  if (idx >= 0) return idx;
  const pipelineIdx = PIPELINE_STEPS.indexOf(step as (typeof PIPELINE_STEPS)[number]);
  if (pipelineIdx < 0) return 0;
  for (let i = MINI_STEPS.length - 1; i >= 0; i--) {
    const miniIdx = PIPELINE_STEPS.indexOf(MINI_STEPS[i]);
    if (pipelineIdx >= miniIdx) return i;
  }
  return 0;
}

interface ActiveProcessingPanelProps {
  videos: Video[];
  jobs: Record<string, Job>;
  cancelling: string | null;
  onCancellingChange: (id: string | null) => void;
}

export function ActiveProcessingPanel({
  videos,
  jobs,
  cancelling,
  onCancellingChange,
}: ActiveProcessingPanelProps) {
  if (videos.length === 0) return null;

  const handleCancel = async (video: Video) => {
    const job = jobs[video.id];
    if (!confirm(`Cancel "${video.title}"?`)) return;
    onCancellingChange(video.id);
    try {
      await cancelVideo(video.id, job?.id);
    } finally {
      onCancellingChange(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <Activity className="h-3.5 w-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-medium text-foreground">Active processing</h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {videos.length}
          </span>
        </div>
        <Link
          href="/videos"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-accent"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-px bg-border/30 sm:grid-cols-2">
        {videos.map((video) => {
          const job = jobs[video.id];
          const progress = job?.progress ?? 0;
          const currentStep = job?.currentStep ?? video.status;
          const current = stepIndex(currentStep);
          const latestLog = job?.logs?.[job.logs.length - 1];

          return (
            <div
              key={video.id}
              className="flex gap-3 bg-card p-3.5 transition-colors hover:bg-muted/20"
            >
              <VideoThumbnailPlayer videoId={video.id} title={video.title} size="md" />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                    {video.title}
                  </p>
                  {canCancelVideo(video.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 shrink-0 gap-0.5 border-red-200/80 px-1.5 text-[11px] text-red-600 hover:bg-red-50"
                      disabled={cancelling === video.id}
                      onClick={() => handleCancel(video)}
                    >
                      <X className="h-3 w-3" />
                      {cancelling === video.id ? "…" : "Cancel"}
                    </Button>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-accent" />
                  <span className="text-[11px] text-muted-foreground">
                    {statusLabel(currentStep)}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    · {progress}%
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1">
                  {MINI_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < current
                          ? "bg-accent/70"
                          : i === current
                            ? "bg-accent animate-pulse"
                            : "bg-border/80"
                      }`}
                      title={statusLabel(step)}
                    />
                  ))}
                </div>

                <Progress value={progress} className="mt-2 h-1" />

                {latestLog && (
                  <p className="mt-1.5 truncate text-[10px] text-muted-foreground/80" title={latestLog.message}>
                    {latestLog.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
