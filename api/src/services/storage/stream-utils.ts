/**
 * Stream utilities for S3/R2 storage operations
 * Uses AWS SDK v3's built-in transformation methods
 */

import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";

type S3Body = NonNullable<GetObjectCommandOutput["Body"]>;

export async function readAsString(body: S3Body): Promise<string> {
  const bytes = await body.transformToByteArray();
  return new TextDecoder().decode(bytes);
}

export async function readAsBuffer(body: S3Body): Promise<Buffer> {
  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}
