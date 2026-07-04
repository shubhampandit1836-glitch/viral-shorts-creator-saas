"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { FileVideo, HardDrive } from "lucide-react";
import { Badge, Progress } from "@acf/ui";
import { AppShell } from "@/components/app-shell";
import { ClipReelCard } from "@/components/clip-reel-card";
import { PipelineStatusPanel } from "@/components/pipeline-status-panel";
import { SyncedTranscript } from "@/components/synced-transcript";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { getClipDownloadUrl } from "@/lib/api";
import { getLocalVideoUrl, getLocalVideoMeta, getLocalVideoBlob } from "@/lib/local-video-store";
import { exportLocalClip } from "@/lib/clip-export";
import { statusLabel, formatDuration, toDate } from "@acf/utils";
import type { Video, Clip, Transcript, Job } from "@acf/types";

type Tab = "overview" | "clips" | "transcript" | "pipeline";

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, firebaseUser } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "clips" || t === "transcript" || t === "pipeline" || t === "overview") {
      setTab(t);
    }
  }, [searchParams]);
  const [search, setSearch] = useState("");
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localMeta, setLocalMeta] = useState<{ localFileName: string; localFilePath: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(getFirebaseDb(), "videos", id), (snap) => {
      if (snap.exists()) setVideo({ ...snap.data(), id: snap.id } as Video);
    });
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    const q = query(
      collection(getFirebaseDb(), "jobs"),
      where("videoId", "==", id),
      where("userId", "==", user.uid)
    );
    return onSnapshot(
      q,
      (snap) => {
        const jobs = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Job);
        setJob(jobs[0] ?? null);
      },
      (err) => console.warn("jobs listener:", err.message)
    );
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    const q = query(
      collection(getFirebaseDb(), "clips"),
      where("videoId", "==", id),
      where("userId", "==", user.uid)
    );
    return onSnapshot(
      q,
      (snap) => {
        setClips(
          snap.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Clip)
            .sort((a, b) => b.score.overall - a.score.overall)
        );
      },
      (err) => console.warn("clips listener:", err.message)
    );
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    return onSnapshot(
      doc(getFirebaseDb(), "transcripts", id),
      (snap) => {
        if (snap.exists()) setTranscript(snap.data() as Transcript);
      },
      (err) => console.warn("transcript listener:", err.message)
    );
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    (async () => {
      url = await getLocalVideoUrl(id);
      const meta = await getLocalVideoMeta(id);
      setLocalVideoUrl(url);
      setLocalMeta(meta);
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  const handleSeek = useCallback((time: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = time;
    void el.play();
  }, []);

  const handleClipDownload = useCallback(
    async (clipId: string) => {
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;

      if (clip.s3Key || clip.portraitS3Key) {
        if (!firebaseUser) return;
        const token = await firebaseUser.getIdToken();
        const { downloadURL, fileName } = await getClipDownloadUrl(token, clipId);
        const a = document.createElement("a");
        a.href = downloadURL;
        a.download = fileName;
        a.click();
        return;
      }

      if (!id) return;
      const blob = await getLocalVideoBlob(id);
      if (!blob) {
        alert("Local video not found in this browser. Re-upload to export reels.");
        return;
      }
      await exportLocalClip(blob, clip.start, clip.end, clip.title);
    },
    [clips, firebaseUser, id]
  );

  if (!video || video.userId !== user?.uid) {
    return (
      <AppShell title="Video">
        <p className="text-[#6B6B6B]">Loading...</p>
      </AppShell>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "clips", label: `Reels (${clips.length})` },
    { key: "transcript", label: "Transcript" },
    { key: "pipeline", label: "Pipeline" },
  ];

  const filteredSegments =
    transcript?.segments.filter(
      (s) => !search || s.text.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  const localPath = video.localFilePath ?? video.localFileName ?? localMeta?.localFilePath;

  return (
    <AppShell title={video.title}>
      {job && video.status !== "completed" && video.status !== "failed" && (
        <div className="mb-6 rounded-xl border border-[#E8E6E1] bg-[#FAF9F5] p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{statusLabel(job.currentStep)}</span>
            <span>{job.progress}%</span>
          </div>
          <Progress value={job.progress} />
        </div>
      )}

      {video.status === "failed" && video.error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Processing failed</p>
          <p className="mt-1">{video.error}</p>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-[#E8E6E1] bg-black">
          {localVideoUrl ? (
            <video
              ref={videoRef}
              src={localVideoUrl}
              controls
              className="aspect-video w-full"
              playsInline
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 text-white/70">
              <FileVideo className="h-12 w-12" />
              <p className="text-sm">Local file not cached in this browser</p>
              <Badge>{statusLabel(video.status)}</Badge>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-[#E8E6E1] bg-white p-4">
          <h3 className="font-semibold">Source file</h3>
          <div className="flex items-start gap-2 text-sm">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-[#D97757]" />
            <div>
              <p className="font-medium">{localPath ?? "Unknown"}</p>
              <p className="mt-1 text-xs text-[#6B6B6B]">
                Played from your local browser cache — no S3 streaming URL needed.
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-[#6B6B6B]">Status</dt>
              <dd><Badge>{statusLabel(video.status)}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-[#6B6B6B]">Duration</dt>
              <dd>{video.duration ? formatDuration(video.duration) : "Processing…"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6B6B6B]">Credits</dt>
              <dd>{video.creditsUsed ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6B6B6B]">Clips ready</dt>
              <dd>{clips.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-[#E8E6E1]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === key
                ? "border-b-2 border-[#D97757] font-medium text-[#1A1A1A]"
                : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <PipelineStatusPanel video={video} job={job} />
      )}

      {tab === "clips" && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {clips.length === 0 ? (
            <p className="text-sm text-[#6B6B6B]">
              9:16 reels will appear here after AI analysis completes.
            </p>
          ) : (
            clips.map((clip) => (
              <ClipReelCard
                key={clip.id}
                clip={{ ...clip, aspectRatio: clip.aspectRatio ?? "9:16" }}
                onDownload={localVideoUrl ? handleClipDownload : undefined}
                previewUrl={localVideoUrl}
              />
            ))
          )}
        </div>
      )}

      {tab === "transcript" && (
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcript..."
            className="mb-4 w-full rounded-lg border border-[#E8E6E1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/30"
          />
          <SyncedTranscript
            segments={filteredSegments}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </div>
      )}

      {tab === "pipeline" && (
        <PipelineStatusPanel video={video} job={job} />
      )}
    </AppShell>
  );
}
