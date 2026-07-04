"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, ExternalLink, MoreHorizontal } from "lucide-react";
import { Badge, Progress, Button } from "@acf/ui";
import { statusLabel, formatDuration, formatRelativeDate, toDate } from "@acf/utils";
import { cancelVideo, canCancelVideo } from "@/lib/videos";
import { getLocalVideoUrl } from "@/lib/local-video-store";
import { VideoThumbnailPlayer } from "@/components/video-thumbnail-player";
import { VideoShortsStrip } from "@/components/video-shorts-strip";
import type { Video, Job, Clip } from "@acf/types";

function statusVariant(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed" || status === "cancelled") return "error" as const;
  if (status === "uploading") return "warning" as const;
  return "default" as const;
}

function isProcessing(status: string) {
  return !["completed", "failed", "cancelled"].includes(status);
}

interface VideosTableProps {
  videos: Video[];
  jobs?: Record<string, Job>;
  clipsByVideo?: Record<string, Clip[]>;
  compact?: boolean;
  onCancel?: () => void;
}

function VideoRow({
  video,
  job,
  clips,
  compact,
  cancelling,
  onCancelStart,
  onCancelEnd,
  onCancelled,
}: {
  video: Video;
  job?: Job;
  clips: Clip[];
  compact: boolean;
  cancelling: string | null;
  onCancelStart: () => void;
  onCancelEnd: () => void;
  onCancelled?: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const progress = job?.progress ?? (video.status === "completed" ? 100 : 0);
  const showCancel = canCancelVideo(video.status);
  const processing = isProcessing(video.status);
  const showShorts = video.status === "completed" && clips.length > 0;

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      url = await getLocalVideoUrl(video.id);
      if (!cancelled) setPreviewUrl(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [video.id]);

  const handleCancel = async () => {
    if (!confirm(`Cancel "${video.title}"? Processing will stop.`)) return;
    onCancelStart();
    try {
      await cancelVideo(video.id, job?.id);
      onCancelled?.();
    } finally {
      onCancelEnd();
    }
  };

  const colSpan = compact ? 5 : 7;

  return (
    <>
      <tr className="group transition-colors hover:bg-muted/25">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <VideoThumbnailPlayer videoId={video.id} title={video.title} />
            <div className="min-w-0">
              <Link
                href={`/video/${video.id}`}
                className="block truncate text-[13px] font-medium text-foreground transition-colors hover:text-accent"
              >
                {video.title}
              </Link>
              {!compact && (
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                  {video.id.slice(0, 8)}
                </p>
              )}
            </div>
          </div>
        </td>

        {!compact && (
          <>
            <td className="max-w-[140px] px-4 py-3">
              <span
                className="block truncate text-[12px] text-muted-foreground"
                title={video.localFilePath}
              >
                {video.localFileName ?? video.localFilePath ?? "—"}
              </span>
            </td>
            <td className="px-4 py-3 text-[12px] tabular-nums text-muted-foreground">
              {video.duration ? formatDuration(video.duration) : "—"}
            </td>
          </>
        )}

        <td className="px-4 py-3">
          <Badge variant={statusVariant(video.status)} className="text-[11px]">
            {statusLabel(video.status)}
          </Badge>
        </td>

        <td className="min-w-[120px] px-4 py-3">
          {processing ? (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-1 flex-1" />
              <span className="w-7 text-right text-[11px] tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
          ) : video.status === "completed" ? (
            <span className="text-[11px] text-emerald-600/80">Done</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
        </td>

        <td className="px-4 py-3 text-[12px] text-muted-foreground">
          {formatRelativeDate(video.uploadedAt)}
        </td>

        {!compact && (
          <td className="px-4 py-3 text-[12px] tabular-nums text-muted-foreground">
            {video.creditsUsed ?? "—"}
          </td>
        )}

        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <Link
              href={`/video/${video.id}`}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-accent transition-colors hover:bg-accent/5"
            >
              View <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
            {showCancel && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-0.5 border-red-200/80 px-2 text-[11px] text-red-600 hover:bg-red-50"
                disabled={cancelling === video.id}
                onClick={handleCancel}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {showShorts && (
        <tr className="bg-muted/10">
          <td colSpan={colSpan} className="p-0">
            <VideoShortsStrip clips={clips} previewUrl={previewUrl} videoId={video.id} />
          </td>
        </tr>
      )}
    </>
  );
}

export function VideosTable({
  videos,
  jobs = {},
  clipsByVideo = {},
  compact = false,
  onCancel,
}: VideosTableProps) {
  const [cancelling, setCancelling] = useState<string | null>(null);

  const sorted = [...videos].sort((a, b) => {
    const da = toDate(a.uploadedAt)?.getTime() ?? 0;
    const db = toDate(b.uploadedAt)?.getTime() ?? 0;
    return db - da;
  });

  const headers = compact
    ? ["Video", "Status", "Progress", "Uploaded", ""]
    : ["Video", "Source", "Duration", "Status", "Progress", "Uploaded", "Credits", ""];

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-muted/25">
              {headers.map((h, i) => (
                <th
                  key={h || "actions"}
                  className={`px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 ${
                    i === headers.length - 1 ? "text-right" : ""
                  }`}
                >
                  {h === "" ? <MoreHorizontal className="ml-auto h-3.5 w-3.5 opacity-40" /> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={compact ? 5 : 8}
                  className="px-4 py-14 text-center text-[13px] text-muted-foreground"
                >
                  No videos yet. Upload your first video to get started.
                </td>
              </tr>
            ) : (
              sorted.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  job={jobs[video.id]}
                  clips={clipsByVideo[video.id] ?? []}
                  compact={compact}
                  cancelling={cancelling}
                  onCancelStart={() => setCancelling(video.id)}
                  onCancelEnd={() => setCancelling(null)}
                  onCancelled={onCancel}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
