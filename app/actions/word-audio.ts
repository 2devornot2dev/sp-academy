// app/actions/word-audio.ts
"use server";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function getWordAudioUrls(
  keys: string[],
): Promise<Record<string, string>> {
  const bucketName =
    process.env.AWS_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.S3_BUCKET;

  if (!bucketName) {
    console.error("[getWordAudioUrls] Missing S3 bucket env var");
    return {};
  }

  const safeKeys = keys.filter(
    (k): k is string =>
      typeof k === "string" && k.trim().length > 0 && !k.includes(".."),
  );

  const entries = await Promise.all(
    safeKeys.map(async (rawKey) => {
      const cleanKey = rawKey.replace(/^\/+/, "");
      try {
        const url = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: bucketName, Key: cleanKey }),
          { expiresIn: 3600 },
        );
        return [rawKey, url] as const;
      } catch (err) {
        console.error(`[getWordAudioUrls] failed for ${rawKey}:`, err);
        return [rawKey, ""] as const;
      }
    }),
  );

  return Object.fromEntries(entries.filter(([, url]) => Boolean(url)));
}