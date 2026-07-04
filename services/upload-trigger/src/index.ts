import type { S3Handler } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { updateVideoStatus, updateJobProgress, appendJobLog } from "@acf/firebase-admin";

const lambda = new LambdaClient({});
const s3 = new S3Client({});

function parseKey(key: string) {
  const parts = key.split("/");
  return {
    userId: parts[1] ?? "unknown",
    videoId: parts[2] ?? "unknown",
    fileName: parts.slice(3).join("/"),
  };
}

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const fromKey = parseKey(key);

    let userId = fromKey.userId;
    let videoId = fromKey.videoId;
    let jobId = `${videoId}-job`;

    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const meta = head.Metadata ?? {};
      userId = meta.userid ?? userId;
      videoId = meta.videoid ?? videoId;
      jobId = meta.jobid ?? jobId;
    } catch (err) {
      console.warn("HeadObject failed, using key path:", err);
    }

    const payload = {
      bucket,
      key,
      userId,
      videoId,
      jobId,
      uploadsBucket: process.env.UPLOADS_BUCKET,
      processingBucket: process.env.PROCESSING_BUCKET,
    };

    try {
      await updateVideoStatus(videoId, "extracting_audio", {
        userId,
        s3Key: key,
        processingStarted: new Date().toISOString(),
      });

      await updateJobProgress(jobId, "extracting_audio", 10, "extracting_audio", {
        videoId,
        userId,
      });
      await appendJobLog(jobId, "extracting_audio", "S3 upload received", 10, "extracting_audio");
    } catch (err) {
      console.error("Firestore update failed:", err);
    }

    await lambda.send(
      new InvokeCommand({
        FunctionName: process.env.AUDIO_EXTRACTOR_FUNCTION!,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );
  }
};
