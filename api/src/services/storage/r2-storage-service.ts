/**
 * R2 Storage Service implementation
 * Handles all R2/S3 operations with retry logic and error handling
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME } from "@/services/r2-client";
import {
  buildR2Key,
  buildBibKey,
  buildAssetKey,
} from "@/services/storage/utils";
import { logger } from "@/utils/logger";
import { AppError, NotFoundError } from "@/lib/errors";
import type { StorageService } from "./interface";

/**
 * Convert S3 error to AppError
 */
function handleS3Error(error: unknown, operation: string, key: string): never {
  if (error instanceof NoSuchKey) {
    throw new NotFoundError(`Storage object not found: ${key}`);
  }

  logger.error({ error, operation, key }, "S3 operation failed");

  if (error instanceof Error) {
    throw new AppError(
      `Storage operation failed: ${error.message}`,
      500,
      "STORAGE_ERROR",
      { operation, key, originalError: error.message }
    );
  }

  throw new AppError(
    "Storage operation failed",
    500,
    "STORAGE_ERROR",
    { operation, key }
  );
}

/**
 * Retry logic with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on NotFoundError or validation errors
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = 100 * Math.pow(2, attempt);
      logger.warn(
        { attempt: attempt + 1, maxRetries, delay, error },
        `Retrying ${operationName}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Convert stream to string
 */
async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export class R2StorageService implements StorageService {
  /**
   * Upload a document's main Typst file
   */
  async uploadDocument(
    userId: string,
    documentId: string,
    content: string | Buffer
  ): Promise<void> {
    const key = buildR2Key(userId, documentId);

    logger.debug({ userId, documentId, key }, "Uploading document to R2");

    await withRetry(
      async () => {
        try {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: content,
              ContentType: "text/plain",
            })
          );

          logger.info({ userId, documentId, key }, "Document uploaded to R2");
        } catch (error) {
          handleS3Error(error, "uploadDocument", key);
        }
      },
      "uploadDocument"
    );
  }

  /**
   * Get a document's main Typst file
   */
  async getDocument(userId: string, documentId: string): Promise<string> {
    const key = buildR2Key(userId, documentId);

    logger.debug({ userId, documentId, key }, "Getting document from R2");

    return await withRetry(
      async () => {
        try {
          const response = await s3Client.send(
            new GetObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            })
          );

          if (!response.Body) {
            throw new NotFoundError(`Document not found: ${key}`);
          }

          const content = await streamToString(
            response.Body as ReadableStream
          );

          logger.info({ userId, documentId, key }, "Document retrieved from R2");
          return content;
        } catch (error) {
          handleS3Error(error, "getDocument", key);
        }
      },
      "getDocument"
    );
  }

  /**
   * Delete a document's main Typst file
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const key = buildR2Key(userId, documentId);

    logger.debug({ userId, documentId, key }, "Deleting document from R2");

    await withRetry(
      async () => {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            })
          );

          logger.info({ userId, documentId, key }, "Document deleted from R2");
        } catch (error) {
          handleS3Error(error, "deleteDocument", key);
        }
      },
      "deleteDocument"
    );
  }

  /**
   * Upload a document's bibliography file
   */
  async uploadBibliography(
    userId: string,
    documentId: string,
    content: string | Buffer
  ): Promise<void> {
    const key = buildBibKey(userId, documentId);

    logger.debug({ userId, documentId, key }, "Uploading bibliography to R2");

    await withRetry(
      async () => {
        try {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: content,
              ContentType: "application/x-bibtex",
            })
          );

          logger.info(
            { userId, documentId, key },
            "Bibliography uploaded to R2"
          );
        } catch (error) {
          handleS3Error(error, "uploadBibliography", key);
        }
      },
      "uploadBibliography"
    );
  }

  /**
   * Get a document's bibliography file
   */
  async getBibliography(userId: string, documentId: string): Promise<string> {
    const key = buildBibKey(userId, documentId);

    logger.debug({ userId, documentId, key }, "Getting bibliography from R2");

    return await withRetry(
      async () => {
        try {
          const response = await s3Client.send(
            new GetObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            })
          );

          if (!response.Body) {
            throw new NotFoundError(`Bibliography not found: ${key}`);
          }

          const content = await streamToString(
            response.Body as ReadableStream
          );

          logger.info(
            { userId, documentId, key },
            "Bibliography retrieved from R2"
          );
          return content;
        } catch (error) {
          handleS3Error(error, "getBibliography", key);
        }
      },
      "getBibliography"
    );
  }

  /**
   * Delete a document's bibliography file
   */
  async deleteBibliography(userId: string, documentId: string): Promise<void> {
    const key = buildBibKey(userId, documentId);

    logger.debug({ userId, documentId, key }, "Deleting bibliography from R2");

    await withRetry(
      async () => {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            })
          );

          logger.info(
            { userId, documentId, key },
            "Bibliography deleted from R2"
          );
        } catch (error) {
          handleS3Error(error, "deleteBibliography", key);
        }
      },
      "deleteBibliography"
    );
  }

  /**
   * Upload an asset file (image, etc.)
   */
  async uploadAsset(
    userId: string,
    documentId: string,
    filename: string,
    content: Buffer,
    contentType: string
  ): Promise<void> {
    const key = buildAssetKey(userId, documentId, filename);

    logger.debug(
      { userId, documentId, filename, key, contentType },
      "Uploading asset to R2"
    );

    await withRetry(
      async () => {
        try {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: content,
              ContentType: contentType,
            })
          );

          logger.info(
            { userId, documentId, filename, key },
            "Asset uploaded to R2"
          );
        } catch (error) {
          handleS3Error(error, "uploadAsset", key);
        }
      },
      "uploadAsset"
    );
  }

  /**
   * Get an asset file
   */
  async getAsset(
    userId: string,
    documentId: string,
    filename: string
  ): Promise<Buffer> {
    const key = buildAssetKey(userId, documentId, filename);

    logger.debug({ userId, documentId, filename, key }, "Getting asset from R2");

    return await withRetry(
      async () => {
        try {
          const response = await s3Client.send(
            new GetObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            })
          );

          if (!response.Body) {
            throw new NotFoundError(`Asset not found: ${key}`);
          }

          const content = await streamToBuffer(
            response.Body as ReadableStream
          );

          logger.info(
            { userId, documentId, filename, key },
            "Asset retrieved from R2"
          );
          return content;
        } catch (error) {
          handleS3Error(error, "getAsset", key);
        }
      },
      "getAsset"
    );
  }

  /**
   * Delete an asset file
   */
  async deleteAsset(
    userId: string,
    documentId: string,
    filename: string
  ): Promise<void> {
    const key = buildAssetKey(userId, documentId, filename);

    logger.debug(
      { userId, documentId, filename, key },
      "Deleting asset from R2"
    );

    await withRetry(
      async () => {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            })
          );

          logger.info(
            { userId, documentId, filename, key },
            "Asset deleted from R2"
          );
        } catch (error) {
          handleS3Error(error, "deleteAsset", key);
        }
      },
      "deleteAsset"
    );
  }

  /**
   * Get public URL for a storage key
   * Note: R2 public URLs require bucket to be configured with public access
   */
  getPublicUrl(key: string): string {
    // This would need to be configured based on your R2 public bucket setup
    // For now, returning a placeholder that would need to be configured
    return `https://${R2_BUCKET_NAME}.r2.dev/${key}`;
  }
}
