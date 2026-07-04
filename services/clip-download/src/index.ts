import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAdminDb } from "@acf/firebase-admin";

const s3 = new S3Client({});
const BUCKET = process.env.PROCESSING_BUCKET!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const clipId = event.pathParameters?.id;
    if (!clipId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "clip id required" }),
      };
    }

    const db = await getAdminDb();
    const snap = await db.collection("clips").doc(clipId).get();
    if (!snap.exists) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Clip not found" }),
      };
    }

    const clip = snap.data()!;
    const s3Key = (clip.portraitS3Key ?? clip.s3Key) as string | undefined;
    if (!s3Key) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Clip file not ready yet" }),
      };
    }

    const fileName = `${(clip.title as string ?? "clip").replace(/[^a-z0-9-_]/gi, "_")}.mp4`;
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
    const downloadURL = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ downloadURL, fileName }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Download failed" }),
    };
  }
};
