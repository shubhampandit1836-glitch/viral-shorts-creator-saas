"use client";

import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "@acf/types";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function findActiveSegmentIndex(segments: TranscriptSegment[], time: number): number {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const end = seg.end > seg.start ? seg.end : segments[i + 1]?.start ?? seg.start + 2;
    if (time >= seg.start && time < end) return i;
  }
  return -1;
}

interface SyncedTranscriptProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export function SyncedTranscript({ segments, currentTime, onSeek }: SyncedTranscriptProps) {
  const activeIndex = findActiveSegmentIndex(segments, currentTime);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex >= 0 && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  if (segments.length === 0) {
    return <p className="text-sm text-[#6B6B6B]">Transcript will appear after processing.</p>;
  }

  return (
    <div className="max-h-[480px] space-y-1 overflow-y-auto rounded-xl border border-[#E8E6E1] p-2">
      {segments.map((seg, i) => {
        const active = i === activeIndex;
        return (
          <div
            key={`${seg.start}-${i}`}
            ref={active ? activeRef : undefined}
            role="button"
            tabIndex={0}
            onClick={() => onSeek(seg.start)}
            onKeyDown={(e) => e.key === "Enter" && onSeek(seg.start)}
            className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2 transition-colors ${
              active
                ? "border border-yellow-300 bg-yellow-100 shadow-sm"
                : "border border-transparent hover:bg-[#FAF9F5]"
            }`}
          >
            <span
              className={`shrink-0 font-mono text-xs ${active ? "font-semibold text-yellow-900" : "text-[#D97757]"}`}
            >
              {formatTimestamp(seg.start)}
            </span>
            <p className={`text-sm ${active ? "font-medium text-[#1A1A1A]" : ""}`}>{seg.text}</p>
          </div>
        );
      })}
    </div>
  );
}
