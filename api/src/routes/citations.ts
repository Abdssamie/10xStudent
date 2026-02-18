/**
 * Citations CRUD routes
 * Manage in-text citations linking documents to sources
 */

import { Hono } from "hono";
import { z } from "zod";

import { schema, eq, and, sql } from "@/infrastructure/db";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/infrastructure/errors";
import { requireDocumentOwnership, requireCitationOwnership } from "@/utils/ownership";

const { documents, citations, sources } = schema;

export const citationsRouter = new Hono();

const createCitationSchema = z.object({
  sourceId: z.string().uuid("Invalid source ID"),
  position: z.number().int().min(0, "Position must be non-negative"),
});

// POST /citations/:documentId - Create a citation
citationsRouter.post("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  const document = await requireDocumentOwnership(documentId, userId, db);

  // Parse and validate request body
  const body = await c.req.json();
  const parsed = createCitationSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError("Invalid request", parsed.error.flatten());
  }

  const { sourceId, position } = parsed.data;

  // Verify source exists and belongs to this document
  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.documentId, documentId)));

  if (!source) {
    throw new NotFoundError("Source not found in this document");
  }

  // Get next citation number
  const citationNumber = document.citationCount + 1;

  // Create citation and increment document citation count in a transaction
  const [citation] = await db.transaction(async (tx) => {
    // Insert citation
    const [newCitation] = await tx
      .insert(citations)
      .values({
        documentId,
        sourceId,
        citationNumber,
        position,
      })
      .returning();

    // Increment document citation count
    await tx
      .update(documents)
      .set({
        citationCount: sql`${documents.citationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return [newCitation];
  });

  if (!citation) {
    throw new NotFoundError("Failed to create citation");
  }

  logger.info(
    { userId, documentId, citationId: citation.id, citationNumber },
    "Citation created"
  );

  return c.json(citation, 201);
});

// GET /citations/:documentId - List all citations for a document
citationsRouter.get("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  const documentCitations = await db
    .select({
      id: citations.id,
      sourceId: citations.sourceId,
      citationNumber: citations.citationNumber,
      position: citations.position,
      createdAt: citations.createdAt,
      source: {
        id: sources.id,
        url: sources.url,
        title: sources.title,
        author: sources.author,
        citationKey: sources.citationKey,
      },
    })
    .from(citations)
    .innerJoin(sources, eq(citations.sourceId, sources.id))
    .where(eq(citations.documentId, documentId))
    .orderBy(citations.citationNumber);

  return c.json(documentCitations);
});

// DELETE /citations/:citationId - Delete a citation
citationsRouter.delete("/:citationId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const citationId = c.req.param("citationId");
  const services = c.get("services");
  const db = services.db;

  // Verify citation ownership and get citation details
  const citation = await requireCitationOwnership(citationId, userId, db);
  const documentId = citation.documentId;

  // Delete citation and decrement document citation count in a transaction
  await db.transaction(async (tx) => {
    // Delete the citation
    await tx.delete(citations).where(eq(citations.id, citationId));

    // Decrement citation count for this document
    await tx
      .update(documents)
      .set({
        citationCount: sql`GREATEST(${documents.citationCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  });

  logger.info({ userId, citationId, documentId }, "Citation deleted");

  return c.body(null, 204);
});
