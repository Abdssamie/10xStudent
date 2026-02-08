/**
 * S3/R2 Client for Cloudflare R2 storage
 * Provides S3-compatible client for uploading and managing files
 */

import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/config/env";

/**
 * Create S3 client configured for Cloudflare R2
 */
export const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET_NAME = env.R2_BUCKET_NAME;
