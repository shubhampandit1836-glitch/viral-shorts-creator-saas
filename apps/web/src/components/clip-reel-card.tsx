"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, ScoreBadge } from "@acf/ui";
import { formatDuration, formatTimestamp } from "@acf/utils";
import type { Clip } from "@acf/types";

interface ClipReelCardProps {
  clip: Clip;
  onDownload?: (clipId: string) => Promise<void>;
  previewUrl?: string | null;
}

export function ClipReelCard({ clip, onDownload, previewUrl }: ClipReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [downloading, setDownloading] = useState(false);
  const duration = clip.end - clip.start;

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

    const onPlay = () => {
      if (video.currentTime < clip.start || video.currentTime >= clip.end) {
        video.currentTime = clip.start;
      }
    };

    video.addEventListener("loadedmetadata", seekToStart);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    seekToStart();

    return () => {
      video.removeEventListener("loadedmetadata", seekToStart);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
    };
  }, [clip.start, clip.end, previewUrl]);

  const handleDownload = async () => {
    if (!onDownload) return;
    setDownloading(true);
    try {
      await onDownload(clip.id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative mx-auto aspect-[9/16] max-h-[420px] w-full max-w-[236px] bg-black">
        {previewUrl ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="h-full w-full object-cover object-center"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-white/80">
            <Play className="h-10 w-10" />
            <p className="text-sm font-medium">{clip.title}</p>
            <p className="text-xs">
              {formatTimestamp(clip.start)} – {formatTimestamp(clip.end)}
            </p>
            <p className="text-xs text-white/60">9:16 reel · {formatDuration(duration)}</p>
          </div>
        )}
        <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          9:16
        </div>
        {previewUrl && (
          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white">
            {formatTimestamp(clip.start)} – {formatTimestamp(clip.end)}
          </div>
        )}
      </div>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base leading-snug">{clip.title}</CardTitle>
        <ScoreBadge score={clip.score.overall} label="Score" />
      </CardHeader>
      <CardContent>
        <p className="mb-1 text-xs font-medium text-[#D97757]">Hook</p>
        <p className="mb-3 text-sm text-[#6B6B6B]">{clip.hook || clip.caption}</p>
        {clip.topic && (
          <p className="mb-3 text-xs text-[#6B6B6B]">
            Topic: <span className="text-[#1A1A1A]">{clip.topic}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(clip.title)}
            className="flex items-center gap-1 rounded-md border border-[#E8E6E1] px-2 py-1 text-xs hover:bg-[#FAF9F5]"
          >
            <Copy className="h-3 w-3" /> Title
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(clip.caption)}
            className="flex items-center gap-1 rounded-md border border-[#E8E6E1] px-2 py-1 text-xs hover:bg-[#FAF9F5]"
          >
            <Copy className="h-3 w-3" /> Caption
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || !onDownload}
            className="flex items-center gap-1 rounded-md border border-[#D97757]/30 bg-[#D97757]/10 px-2 py-1 text-xs text-[#D97757] hover:bg-[#D97757]/20 disabled:opacity-50"
          >
            <Download className="h-3 w-3" /> {downloading ? "Exporting…" : "Download reel"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
