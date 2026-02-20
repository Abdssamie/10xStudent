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
import { readAsString, readAsBuffer } from "./stream-utils";
import { logger } from "@/utils/logger";
import { AppError, NotFoundError } from "@/infrastructure/errors";
import type { StorageService } from "./interface";

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

  throw new AppError("Storage operation failed", 500, "STORAGE_ERROR", {
    operation,
    key,
  });
}

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

      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

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

export class R2StorageService implements StorageService {
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

          const content = await readAsString(response.Body);

          logger.info({ userId, documentId, key }, "Document retrieved from R2");
          return content;
        } catch (error) {
          handleS3Error(error, "getDocument", key);
        }
      },
      "getDocument"
    );
  }

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

          logger.info({ userId, documentId, key }, "Bibliography uploaded to R2");
        } catch (error) {
          handleS3Error(error, "uploadBibliography", key);
        }
      },
      "uploadBibliography"
    );
  }

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

          const content = await readAsString(response.Body);

          logger.info({ userId, documentId, key }, "Bibliography retrieved from R2");
          return content;
        } catch (error) {
          handleS3Error(error, "getBibliography", key);
        }
      },
      "getBibliography"
    );
  }

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

          logger.info({ userId, documentId, key }, "Bibliography deleted from R2");
        } catch (error) {
          handleS3Error(error, "deleteBibliography", key);
        }
      },
      "deleteBibliography"
    );
  }

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

          logger.info({ userId, documentId, filename, key }, "Asset uploaded to R2");
        } catch (error) {
          handleS3Error(error, "uploadAsset", key);
        }
      },
      "uploadAsset"
    );
  }

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

          const content = await readAsBuffer(response.Body);

          logger.info({ userId, documentId, filename, key }, "Asset retrieved from R2");
          return content;
        } catch (error) {
          handleS3Error(error, "getAsset", key);
        }
      },
      "getAsset"
    );
  }

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

          logger.info({ userId, documentId, filename, key }, "Asset deleted from R2");
        } catch (error) {
          handleS3Error(error, "deleteAsset", key);
        }
      },
      "deleteAsset"
    );
  }

  getPublicUrl(key: string): string {
    return `https://${R2_BUCKET_NAME}.r2.dev/${key}`;
  }
}
