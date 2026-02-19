/**
 * Sources CRUD routes
 * Enables users to add, list, update, and delete research sources for their documents.
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import {
  createSourceSchema,
  sourceResponseSchema,
  updateSourceSchema,
} from "@shared/src/api/sources";

import { schema, eq, and } from "@/infrastructure/db";
import type { NewSource } from "@/infrastructure/db/schema/sources";
import { NotFoundError } from "@/infrastructure/errors";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { scrapeUrl } from "@/lib/firecrawl";
import { logger } from "@/utils/logger";
import { requireDocumentOwnership, requireSourceOwnership } from "@/utils/ownership";
import { detectSourceType } from "@/utils/source-detection";

const { documents, sources } = schema;

export const sourcesRouter = new OpenAPIHono();

const createSourceRoute = createRoute({
  method: "post",
  path: "/{documentId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: createSourceSchema.omit({ documentId: true }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: sourceResponseSchema,
        },
      },
      description: "Source created successfully",
    },
  },
  tags: ["Sources"],
});

sourcesRouter.openapi(createSourceRoute, async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const { documentId } = c.req.valid("param");
    const services = c.get("services");
    const db = services.db;

    // Verify document ownership
    await requireDocumentOwnership(documentId, userId, db);

    const { url, citationKey } = c.req.valid("json");

    try {
        // Step 1: Scrape URL for metadata
        const scraped = await scrapeUrl(url);

        // Step 2: Generate embedding from content
        let embedding: number[] | undefined;
        if (scraped.content && scraped.content.length > 0) {
            embedding = await generateEmbedding(scraped.content);
        }

        // Step 3: Parse publication date if available
        let publicationDate: Date | undefined;
        if (scraped.publishedDate) {
            const parsed = new Date(scraped.publishedDate);
            if (!isNaN(parsed.getTime())) {
                publicationDate = parsed;
            }
        }

        // Step 4: Build source insert with auto-detected type
        const sourceInsert: NewSource = {
            documentId,
            url,
            citationKey,
            title: scraped.title,
            content: scraped.content,
            embedding,
            author: scraped.author,
            publicationDate,
            sourceType: detectSourceType(url),
        };

        // Step 5: Insert into database
        const [inserted] = await db.insert(sources).values(sourceInsert).returning();

        if (!inserted) throw new NotFoundError("Failed to create source");

        return c.json(inserted, 201);
    } catch (error) {
        logger.error({ error, url, documentId }, "Failed to add source");
        throw error;
    }
});

const listSourcesRoute = createRoute({
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
          schema: z.array(sourceResponseSchema),
        },
      },
      description: "List of document sources",
    },
  },
  tags: ["Sources"],
});

sourcesRouter.openapi(listSourcesRoute, async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const { documentId } = c.req.valid("param");
    const services = c.get("services");
    const db = services.db;

    // Verify document ownership
    await requireDocumentOwnership(documentId, userId, db);

    const documentSources = await db
        .select({
            id: sources.id,
            url: sources.url,
            title: sources.title,
            author: sources.author,
            sourceType: sources.sourceType,
            publicationDate: sources.publicationDate,
            createdAt: sources.createdAt,
        })
        .from(sources)
        .where(eq(sources.documentId, documentId));

    return c.json(documentSources);
});

const updateSourceRoute = createRoute({
  method: "patch",
  path: "/{sourceId}",
  request: {
    params: z.object({
      sourceId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateSourceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: sourceResponseSchema,
        },
      },
      description: "Source updated successfully",
    },
  },
  tags: ["Sources"],
});

sourcesRouter.openapi(updateSourceRoute, async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const { sourceId } = c.req.valid("param");
    const services = c.get("services");
    const db = services.db;

    // Verify source ownership
    await requireSourceOwnership(sourceId, userId, db);

    const body = c.req.valid("json");

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.author !== undefined) updates.author = body.author;
    if (body.publicationDate !== undefined) {
        updates.publicationDate = new Date(body.publicationDate);
    }

    const [updated] = await db
        .update(sources)
        .set(updates)
        .where(eq(sources.id, sourceId))
        .returning();

    if (!updated) throw new NotFoundError("Failed to update source");

    return c.json(updated);
});

const deleteSourceRoute = createRoute({
  method: "delete",
  path: "/{sourceId}",
  request: {
    params: z.object({
      sourceId: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Source deleted successfully",
    },
  },
  tags: ["Sources"],
});

sourcesRouter.openapi(deleteSourceRoute, async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const { sourceId } = c.req.valid("param");
    const services = c.get("services");
    const db = services.db;

    // Verify source ownership
    await requireSourceOwnership(sourceId, userId, db);

    await db.delete(sources).where(eq(sources.id, sourceId));

    return c.body(null, 204);
});
