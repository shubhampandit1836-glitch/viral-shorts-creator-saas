"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Film, Loader2, CheckCircle, Scissors } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VideosTable } from "@/components/videos-table";
import { ActiveProcessingPanel } from "@/components/active-processing-panel";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { useUserClips } from "@/hooks/use-user-clips";
import type { Video, Job } from "@acf/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);
  const clipsByVideo = useUserClips(user?.uid);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(getFirebaseDb(), "videos"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Video));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(getFirebaseDb(), "jobs"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const map: Record<string, Job> = {};
      snap.docs.forEach((d) => {
        const job = { ...d.data(), id: d.id } as Job;
        map[job.videoId] = job;
      });
      setJobs(map);
    });
  }, [user]);

  const processing = videos.filter((v) => !["completed", "failed", "cancelled"].includes(v.status));
  const completed = videos.filter((v) => v.status === "completed");

  const stats = [
    { label: "Total Videos", value: videos.length, icon: Film },
    { label: "Credits Left", value: user?.credits ?? 0, icon: Scissors },
    { label: "Processing", value: processing.length, icon: Loader2 },
    { label: "Completed", value: completed.length, icon: CheckCircle },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border/50 bg-card px-4 py-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                  <Icon className="h-3.5 w-3.5 text-accent" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {processing.length > 0 && (
          <ActiveProcessingPanel
            videos={processing}
            jobs={jobs}
            cancelling={cancelling}
            onCancellingChange={setCancelling}
          />
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium text-foreground">Your videos</h2>
          <VideosTable videos={videos} jobs={jobs} clipsByVideo={clipsByVideo} />
        </section>
      </div>
    </AppShell>
  );
}
