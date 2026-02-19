/**
 * Citations CRUD routes
 * Manage in-text citations linking documents to sources
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { createCitationBodySchema, citationResponseSchema } from "@shared/src/api/citations";

import { schema, eq, and, sql } from "@/infrastructure/db";
import { NotFoundError } from "@/infrastructure/errors";
import { logger } from "@/utils/logger";
import { requireDocumentOwnership, requireCitationOwnership } from "@/utils/ownership";

const { documents, citations, sources } = schema;

export const citationsRouter = new OpenAPIHono();

const createCitationRoute = createRoute({
  method: "post",
  path: "/{documentId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: createCitationBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: citationResponseSchema,
        },
      },
      description: "Citation created successfully",
    },
  },
  tags: ["Citations"],
});

citationsRouter.openapi(createCitationRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  const document = await requireDocumentOwnership(documentId, userId, db);

  const { sourceId, position } = c.req.valid("json");

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

const listCitationsRoute = createRoute({
  method: "get",
  path: "/{documentId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            citationResponseSchema.extend({
              source: z.object({
                id: z.string().uuid(),
                url: z.string().url(),
                title: z.string().nullable(),
                author: z.string().nullable(),
                citationKey: z.string().nullable(),
              }),
            })
          ),
        },
      },
      description: "List of document citations with source details",
    },
  },
  tags: ["Citations"],
});

citationsRouter.openapi(listCitationsRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  const documentCitations = await db
    .select({
      id: citations.id,
      documentId: citations.documentId,
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

const deleteCitationRoute = createRoute({
  method: "delete",
  path: "/{citationId}",
  request: {
    params: z.object({
      citationId: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Citation deleted successfully",
    },
  },
  tags: ["Citations"],
});

citationsRouter.openapi(deleteCitationRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { citationId } = c.req.valid("param");
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
