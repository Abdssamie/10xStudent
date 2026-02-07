/**
 * R2 Storage service for Cloudflare R2 (S3-compatible)
 * Handles file paths and storage operations for Typst documents and assets
 */

/**
 * Build R2 key for a document's main Typst file
 * Format: documents/{userId}/{documentId}/main.typ
 */
export function buildR2Key(userId: string, documentId: string): string {
  return `documents/${userId}/${documentId}/main.typ`;
}

/**
 * Build R2 key for a document's bibliography file
 * Format: documents/{userId}/{documentId}/refs.bib
 */
export function buildBibKey(userId: string, documentId: string): string {
  return `documents/${userId}/${documentId}/refs.bib`;
}

/**
 * Build R2 key for a document asset (images, files, etc.)
 * Format: documents/{userId}/{documentId}/assets/{filename}
 */
export function buildAssetKey(
  userId: string,
  documentId: string,
  filename: string,
): string {
  return `documents/${userId}/${documentId}/assets/${filename}`;
}
