"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Scissors } from "lucide-react";
import type { Clip } from "@acf/types";

interface VideoShortsStripProps {
  clips: Clip[];
  previewUrl: string | null;
  videoId: string;
  maxVisible?: number;
}

function MiniClipPreview({
  clip,
  previewUrl,
}: {
  clip: Clip;
  previewUrl: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl) return;

    const seekToStart = () => {
      if (video.duration && clip.start < video.duration) {
        video.currentTime = clip.start;
      }
    };

    const onTimeUpdate = () => {
      if (video.currentTime >= clip.end) {
        video.pause();
        video.currentTime = clip.start;
      }
    };

    video.addEventListener("loadedmetadata", seekToStart);
    video.addEventListener("timeupdate", onTimeUpdate);
    seekToStart();

    return () => {
      video.removeEventListener("loadedmetadata", seekToStart);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [clip.start, clip.end, previewUrl]);

  return (
    <div className="group/clip relative shrink-0">
      <div className="relative h-[72px] w-10 overflow-hidden rounded-md bg-black ring-1 ring-border/40">
        {previewUrl ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            onMouseEnter={(e) => void e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = clip.start;
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-center">
            <Play className="h-3 w-3 text-white/60" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5 pt-3">
          <span className="text-[8px] font-medium tabular-nums text-white/90">
            {Math.round(clip.score.overall)}
          </span>
        </div>
      </div>
      <p className="mt-1 max-w-10 truncate text-[9px] text-muted-foreground" title={clip.title}>
        {clip.title}
      </p>
    </div>
  );
}

export function VideoShortsStrip({
  clips,
  previewUrl,
  videoId,
  maxVisible = 4,
}: VideoShortsStripProps) {
  if (clips.length === 0) return null;

  const visible = clips.slice(0, maxVisible);
  const remaining = clips.length - maxVisible;

  return (
    <div className="flex items-center gap-3 border-t border-border/30 bg-muted/15 px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        <Scissors className="h-3 w-3 text-accent" />
        <span className="text-[11px] font-medium">
          {clips.length} short{clips.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-start gap-2 overflow-x-auto pb-0.5">
        {visible.map((clip) => (
          <MiniClipPreview key={clip.id} clip={clip} previewUrl={previewUrl} />
        ))}
        {remaining > 0 && (
          <Link
            href={`/video/${videoId}?tab=clips`}
            className="flex h-[72px] w-10 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-border/60 bg-card text-[10px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            +{remaining}
          </Link>
        )}
      </div>

      <Link
        href={`/video/${videoId}?tab=clips`}
        className="shrink-0 text-[11px] text-accent hover:underline"
      >
        View all
      </Link>
    </div>
  );
}
