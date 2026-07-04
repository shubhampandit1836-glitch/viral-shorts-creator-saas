import type { Handler } from "aws-lambda";
import { updateVideoStatus, updateJobProgress } from "@acf/firebase-admin";

export const handler: Handler = async (event) => {
  const body = typeof event === "string" ? JSON.parse(event) : event;
  const { videoId, jobId } = body;

  await updateVideoStatus(videoId, "completed", {
    completedAt: new Date().toISOString(),
  });

  if (jobId) {
    await updateJobProgress(jobId, "completed", 100, "completed", {
      videoId,
      completedAt: new Date().toISOString(),
    });
  }

  return { statusCode: 200, videoId, jobId, status: "completed" };
};
