/**
 * Ownership verification utilities
 * Provides reusable functions to verify resource ownership and throw appropriate errors
 */

import { db, schema, eq, and } from "@/database";
import { NotFoundError } from "@/errors";
import { logger } from "@/utils/logger";

const { documents, sources } = schema;

/**
 * Verify document ownership and return the document if owned
 * @throws NotFoundError if document doesn't exist or user doesn't own it
 */
export async function requireDocumentOwnership(
  documentId: string,
  userId: string
) {
  logger.debug(
    { documentId, userId, operation: "verify_document_ownership" },
    "Verifying document ownership"
  );

  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  if (!document) {
    logger.warn(
      { documentId, userId },
      "Document not found or access denied"
    );
    throw new NotFoundError("Document not found");
  }

  return document;
}

/**
 * Verify source ownership via its parent document and return the source if owned
 * @throws NotFoundError if source doesn't exist or user doesn't own it
 */
export async function requireSourceOwnership(
  sourceId: string,
  userId: string
) {
  logger.debug(
    { sourceId, userId, operation: "verify_source_ownership" },
    "Verifying source ownership"
  );

  const [result] = await db
    .select({
      source: sources,
      documentUserId: documents.userId,
    })
    .from(sources)
    .innerJoin(documents, eq(sources.documentId, documents.id))
    .where(and(eq(sources.id, sourceId), eq(documents.userId, userId)));

  if (!result?.source) {
    logger.warn(
      { sourceId, userId },
      "Source not found or access denied"
    );
    throw new NotFoundError("Source not found");
  }

  return result.source;
}
