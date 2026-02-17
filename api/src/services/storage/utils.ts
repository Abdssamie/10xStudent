/**
 * R2 Storage Utils for Cloudflare R2 (S3-compatible)
 * Handles file paths and storage operations for Typst documents and assets
 */

import sanitize from "sanitize-filename";
import { ValidationError } from "@/lib/errors";

/**
 * UUID validation regex - accepts any valid UUID format (v1, v4, v5, v7)
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate userId format (must be a valid UUID)
 * Prevents path traversal attacks
 * @throws Error if userId is invalid
 */
export function validateUserId(userId: string): void {
  if (!UUID_REGEX.test(userId)) {
    throw new ValidationError("Invalid userId format: must be a valid UUID");
  }
}

/**
 * Validate documentId format (must be a valid UUID)
 * Prevents path traversal attacks
 * @throws Error if documentId is invalid
 */
export function validateDocumentId(documentId: string): void {
  if (!UUID_REGEX.test(documentId)) {
    throw new ValidationError("Invalid documentId format: must be a valid UUID");
  }
}

/**
 * Sanitize filename to prevent path traversal attacks
 * Uses sanitize-filename package which:
 * - Removes control characters
 * - Removes reserved characters (/, ?, <, >, \, :, *, |, ")
 * - Removes Unix reserved filenames (. and ..)
 * - Removes trailing periods and spaces (Windows)
 * - Removes Windows reserved filenames (CON, PRN, AUX, etc.)
 * - Truncates to 255 bytes
 * @throws Error if filename is empty or sanitization results in empty string
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.length === 0) {
    throw new ValidationError("Filename cannot be empty");
  }

  const sanitized = sanitize(filename);

  // sanitize-filename can return empty string for certain inputs (e.g., "..", ".")
  if (!sanitized || sanitized.length === 0) {
    throw new ValidationError("Filename cannot be empty after sanitization");
  }

  return sanitized;
}

/**
 * Build R2 key for a document's main Typst file
 * Format: documents/{userId}/{documentId}/main.typ
 * @throws Error if userId or documentId are invalid
 */
export function buildR2Key(userId: string, documentId: string): string {
  validateUserId(userId);
  validateDocumentId(documentId);
  return `documents/${userId}/${documentId}/main.typ`;
}

/**
 * Build R2 key for a document's bibliography file
 * Format: documents/{userId}/{documentId}/refs.bib
 * @throws Error if userId or documentId are invalid
 */
export function buildBibKey(userId: string, documentId: string): string {
  validateUserId(userId);
  validateDocumentId(documentId);
  return `documents/${userId}/${documentId}/refs.bib`;
}

/**
 * Build R2 key for a document asset (images, files, etc.)
 * Format: documents/{userId}/{documentId}/assets/{filename}
 * @throws Error if userId, documentId, or filename are invalid
 */
export function buildAssetKey(
  userId: string,
  documentId: string,
  filename: string,
): string {
  validateUserId(userId);
  validateDocumentId(documentId);
  const sanitizedFilename = sanitizeFilename(filename);
  return `documents/${userId}/${documentId}/assets/${sanitizedFilename}`;
}
