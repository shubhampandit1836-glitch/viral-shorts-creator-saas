import type { APIGatewayProxyHandler } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({});
const BUCKET = process.env.UPLOADS_BUCKET!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const { fileName, contentType, userId } = body;

    if (!fileName || !userId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "fileName and userId are required" }),
      };
    }

    const videoId = uuidv4();
    const jobId = uuidv4();
    const videoKey = `uploads/${userId}/${videoId}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: videoKey,
      ContentType: contentType ?? "video/mp4",
      Metadata: { userId, videoId, jobId },
    });

    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ uploadURL, videoKey, jobId, videoId }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to generate upload URL" }),
    };
  }
};
