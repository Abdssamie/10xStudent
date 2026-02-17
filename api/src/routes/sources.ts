/**
 * Sources CRUD routes
 * Enables users to add, list, update, and delete research sources for their documents.
 */

import { Hono } from "hono";
import { schema, eq, and } from "@/database";
import { authMiddleware } from "@/middleware/auth";
import { scrapeUrl } from "@/services/firecrawl";
import { generateEmbedding } from "@/lib/embeddings";
import { detectSourceType } from "@/utils/source-detection";
import { createSourceSchema, updateSourceSchema } from "@shared/src/source";
import type { NewSource } from "@/database/schema/sources";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireDocumentOwnership, requireSourceOwnership } from "@/utils/ownership";

const { documents, sources } = schema;

export const sourcesRouter = new Hono();

// POST /sources/:documentId - Add a source by URL
sourcesRouter.post("/:documentId", async (c) => {
    const auth = c.get("auth");
    const userId = auth.userId;
    const documentId = c.req.param("documentId");
    const services = c.get("services");
    const db = services.db;

    // Verify document ownership
    await requireDocumentOwnership(documentId, userId, db);

    // Parse and validate request body
    const body = await c.req.json();
    const parsed = createSourceSchema.safeParse({ ...body, documentId });

    if (!parsed.success) {
        throw new ValidationError("Invalid request", parsed.error.flatten());
    }

    const { url, citationKey } = parsed.data;

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

        return c.json(inserted, 201);
    } catch (error) {
        logger.error({ error, url, documentId }, "Failed to add source");
        throw error;
    }
});

// GET /sources/:documentId - List all sources for a document
sourcesRouter.get("/:documentId", async (c) => {
    const auth = c.get("auth");
    const userId = auth.userId;
    const documentId = c.req.param("documentId");
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

// PATCH /sources/:sourceId - Update source metadata
sourcesRouter.patch("/:sourceId", async (c) => {
    const auth = c.get("auth");
    const userId = auth.userId;
    const sourceId = c.req.param("sourceId");
    const services = c.get("services");
    const db = services.db;

    // Verify source ownership
    await requireSourceOwnership(sourceId, userId, db);

    // Parse and validate request body
    const body = await c.req.json();
    const parsed = updateSourceSchema.safeParse(body);

    if (!parsed.success) {
        throw new ValidationError("Invalid request", parsed.error.flatten());
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.author !== undefined) updates.author = parsed.data.author;
    if (parsed.data.publicationDate !== undefined) {
        updates.publicationDate = new Date(parsed.data.publicationDate);
    }

    const [updated] = await db
        .update(sources)
        .set(updates)
        .where(eq(sources.id, sourceId))
        .returning();

    return c.json(updated);
});

// DELETE /sources/:sourceId - Delete a source
sourcesRouter.delete("/:sourceId", async (c) => {
    const auth = c.get("auth");
    const userId = auth.userId;
    const sourceId = c.req.param("sourceId");
    const services = c.get("services");
    const db = services.db;

    // Verify source ownership
    await requireSourceOwnership(sourceId, userId, db);

    await db.delete(sources).where(eq(sources.id, sourceId));

    return c.body(null, 204);
});
