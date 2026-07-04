"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@acf/ui";
import { PIPELINE_STEPS, statusLabel, toDate } from "@acf/utils";
import type { Job, Video } from "@acf/types";
import { AlertCircle, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface PipelineStatusPanelProps {
  video: Video;
  job: Job | null;
}

function errorMessage(video: Video, job: Job | null): string | null {
  if (video.error) return video.error;
  const failedLog = job?.logs?.find((l) => l.step === "failed");
  return failedLog?.message ?? null;
}

export function PipelineStatusPanel({ video, job }: PipelineStatusPanelProps) {
  const failed = video.status === "failed" || video.status === "cancelled";
  const error = errorMessage(video, job);
  const failedStep = failed
    ? (job?.currentStep ?? job?.status ?? video.status)
    : null;
  const currentIdx = failed
    ? PIPELINE_STEPS.indexOf(failedStep as (typeof PIPELINE_STEPS)[number])
    : PIPELINE_STEPS.indexOf(
        (job?.currentStep ?? video.status) as (typeof PIPELINE_STEPS)[number]
      );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {failed && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 lg:col-span-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Processing stopped</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PIPELINE_STEPS.map((step, i) => {
            const stepFailed = failed && currentIdx === i;
            const done = !stepFailed && (currentIdx > i || video.status === "completed");
            const active =
              !failed && currentIdx === i && video.status !== "completed";
            return (
              <div key={step} className="flex items-center gap-3 text-sm">
                {stepFailed ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" />
                ) : (
                  <Circle className="h-4 w-4 text-[#E8E6E1]" />
                )}
                <span
                  className={
                    stepFailed
                      ? "font-medium text-red-700"
                      : active
                        ? "font-medium text-[#1A1A1A]"
                        : "text-[#6B6B6B]"
                  }
                >
                  {statusLabel(step)}
                </span>
                {active && job && <Badge>{job.progress}%</Badge>}
                {stepFailed && error && (
                  <span className="truncate text-xs text-red-600" title={error}>
                    {error}
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          {!job?.logs?.length ? (
            <p className="text-sm text-[#6B6B6B]">Logs appear as processing runs.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {[...job.logs].reverse().map((log, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    log.step === "failed" ? "bg-red-50" : "bg-[#FAF9F5]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-medium ${
                        log.step === "failed" ? "text-red-600" : "text-[#D97757]"
                      }`}
                    >
                      {statusLabel(log.step)}
                    </span>
                    <span className="text-[#6B6B6B]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className={`mt-1 ${log.step === "failed" ? "text-red-700" : "text-[#6B6B6B]"}`}>
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Video metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Video ID", video.id],
              ["S3 key", video.s3Key],
              ["Local file", video.localFilePath ?? video.localFileName ?? "Not cached locally"],
              ["Status", statusLabel(video.status)],
              ["Credits used", String(video.creditsUsed ?? "—")],
              ["Uploaded", toDate(video.uploadedAt)?.toLocaleString() ?? "—"],
              ["Processing started", video.processingStarted ?? "—"],
              ["Completed", video.completedAt ?? "—"],
              ...(video.error ? [["Error", video.error] as const] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-[#6B6B6B]">{label}</dt>
                <dd
                  className={`mt-0.5 break-all font-medium ${
                    label === "Error" ? "text-red-700" : ""
                  }`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
