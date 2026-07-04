import type { Handler } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({});

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export const handler: Handler = async (event) => {
  const body = typeof event === "string" ? JSON.parse(event) : event;
  const segments: TranscriptSegment[] = body.transcript?.segments ?? [];
  const chunks: TranscriptSegment[] = [];
  let current: TranscriptSegment[] = [];
  let chunkStart = 0;

  for (const seg of segments) {
    current.push(seg);
    const duration = seg.end - chunkStart;
    if (duration >= 30) {
      chunks.push({
        start: chunkStart,
        end: seg.end,
        text: current.map((s) => s.text).join(" "),
      });
      current = [];
      chunkStart = seg.end;
    }
  }

  if (current.length) {
    const last = current[current.length - 1];
    chunks.push({
      start: chunkStart,
      end: last.end,
      text: current.map((s) => s.text).join(" "),
    });
  }

  const analyzerFunction = process.env.AI_ANALYZER_FUNCTION!;

  for (let i = 0; i < chunks.length; i++) {
    await lambda.send(
      new InvokeCommand({
        FunctionName: analyzerFunction,
        InvocationType: "Event",
        Payload: Buffer.from(
          JSON.stringify({
            ...body,
            chunkId: `chunk-${i}`,
            chunkIndex: i,
            totalChunks: chunks.length,
            chunk: chunks[i],
          })
        ),
      })
    );
  }

  return { statusCode: 200, chunksCreated: chunks.length };
};
