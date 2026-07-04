"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  Film,
  Loader2,
  CheckCircle2,
  Upload,
  Search,
  Filter,
  Sparkles,
} from "lucide-react";
import { Button } from "@acf/ui";
import { AppShell } from "@/components/app-shell";
import { VideosTable } from "@/components/videos-table";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { useUserClips } from "@/hooks/use-user-clips";
import type { Video, Job } from "@acf/types";

type FilterKey = "all" | "processing" | "completed" | "failed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

export default function VideosPage() {
  const { user } = useAuth();
  const clipsByVideo = useUserClips(user?.uid);
  const [videos, setVideos] = useState<Video[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

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
  const failed = videos.filter((v) => v.status === "failed" || v.status === "cancelled");

  const stats = [
    {
      label: "Total videos",
      value: videos.length,
      icon: Film,
      accent: "from-orange-400/20 to-orange-600/5",
    },
    {
      label: "Processing",
      value: processing.length,
      icon: Loader2,
      accent: "from-blue-400/20 to-blue-600/5",
    },
    {
      label: "Completed",
      value: completed.length,
      icon: CheckCircle2,
      accent: "from-emerald-400/20 to-emerald-600/5",
    },
    {
      label: "Credits used",
      value: videos.reduce((sum, v) => sum + (v.creditsUsed ?? 0), 0),
      icon: Sparkles,
      accent: "from-amber-400/20 to-amber-600/5",
    },
  ];

  const filteredVideos = useMemo(() => {
    let list = videos;
    if (filter === "processing") {
      list = processing;
    } else if (filter === "completed") {
      list = completed;
    } else if (filter === "failed") {
      list = failed;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.localFileName?.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [videos, filter, search, processing, completed, failed]);

  return (
    <AppShell title="Videos">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Your library</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track uploads, processing status, and open any video to view clips.
            </p>
          </div>
          <Button variant="accent" asChild className="shrink-0 gap-2 shadow-sm">
            <Link href="/dashboard">
              <Upload className="h-4 w-4" />
              Upload video
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${accent} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 font-serif text-3xl font-semibold tabular-nums">{value}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-2.5 shadow-sm ring-1 ring-border/40">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by title or filename…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-background pl-10 pr-4 text-sm outline-none ring-accent/20 transition focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" />
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    filter === key
                      ? "bg-accent text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredVideos.length === 0 && videos.length > 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">No videos match your search or filter.</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-white to-muted/30 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Film className="h-7 w-7 text-accent" />
            </div>
            <h3 className="font-serif text-xl font-semibold">No videos yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Upload a long-form video and we&apos;ll extract the best short clips automatically.
            </p>
            <Button variant="accent" asChild className="mt-6 gap-2">
              <Link href="/dashboard">
                <Upload className="h-4 w-4" />
                Upload your first video
              </Link>
            </Button>
          </div>
        ) : (
          <VideosTable videos={filteredVideos} jobs={jobs} clipsByVideo={clipsByVideo} />
        )}
      </div>
    </AppShell>
  );
}
