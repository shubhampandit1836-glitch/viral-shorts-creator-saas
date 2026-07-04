"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Play, X } from "lucide-react";
import { getLocalVideoUrl } from "@/lib/local-video-store";

interface VideoThumbnailPlayerProps {
  videoId: string;
  title: string;
  size?: "sm" | "md";
}

export function VideoThumbnailPlayer({ videoId, title, size = "sm" }: VideoThumbnailPlayerProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const captureRef = useRef<HTMLVideoElement>(null);

  const dimensions = size === "sm" ? "h-11 w-[4.5rem]" : "h-14 w-[5.5rem]";

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const url = await getLocalVideoUrl(videoId);
      if (cancelled) return;
      if (!url) {
        setLoading(false);
        return;
      }
      objectUrl = url;
      setVideoUrl(url);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoId]);

  useEffect(() => {
    const video = captureRef.current;
    if (!video || !videoUrl) return;

    const captureFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbUrl(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        // CORS or codec issues — fall back to placeholder
      } finally {
        setLoading(false);
      }
    };

    const onLoaded = () => {
      if (video.duration && video.duration > 1) {
        video.currentTime = Math.min(1, video.duration * 0.05);
      } else {
        captureFrame();
      }
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("seeked", captureFrame);
    video.src = videoUrl;

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("seeked", captureFrame);
    };
  }, [videoUrl]);

  return (
    <>
      <button
        type="button"
        onClick={() => videoUrl && setPlaying(true)}
        disabled={!videoUrl}
        className={`group relative shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/50 transition-all hover:ring-accent/40 disabled:cursor-default ${dimensions}`}
        aria-label={videoUrl ? `Play ${title}` : `${title} — no local preview`}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Film className={`text-muted-foreground/50 ${size === "sm" ? "h-4 w-4" : "h-5 w-5"}`} />
          </div>
        )}
        {videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <Play className="ml-0.5 h-3 w-3 fill-foreground text-foreground" />
            </div>
          </div>
        )}
        {loading && videoUrl && (
          <div className="absolute inset-0 animate-pulse bg-muted/60" />
        )}
      </button>

      <video ref={captureRef} className="hidden" preload="metadata" muted playsInline />

      {playing && videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPlaying(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              aria-label="Close player"
            >
              <X className="h-4 w-4" />
            </button>
            <video
              src={videoUrl}
              className="aspect-video w-full"
              controls
              autoPlay
              playsInline
            />
            <p className="truncate px-3 py-2 text-xs text-white/80">{title}</p>
          </div>
        </div>
      )}
    </>
  );
}
