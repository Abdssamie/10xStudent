/**
 * Sources CRUD routes
 * Enables users to add, list, update, and delete research sources for their documents.
 */

import { Hono } from "hono";
import { db, schema, eq, and } from "@/database";
import { authMiddleware } from "@/middleware/auth";
import { scrapeUrl } from "@/services/firecrawl";
import { generateEmbedding } from "@/lib/embeddings";
import { detectSourceType } from "@/utils/source-detection";
import { createSourceSchema, updateSourceSchema } from "@shared/src/source";
import type { NewSource } from "@/database/schema/sources";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/errors";
import { Sentry } from "@/lib/sentry";
import { addOperationBreadcrumb, setOperationTags } from "@/middleware/sentry-context";

const { documents, sources } = schema;

export const sourcesRouter = new Hono();

/**
 * Verify that a document belongs to the authenticated user.
 * Returns the document if owned, null otherwise.
 */
async function verifyDocumentOwnership(documentId: string, userId: string) {
    const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
    return document || null;
}

/**
 * Verify source ownership via its parent document.
 * Returns the source if owned, null otherwise.
 */
async function verifySourceOwnership(sourceId: string, userId: string) {
    const [source] = await db
        .select({
            source: sources,
            documentUserId: documents.userId,
        })
        .from(sources)
        .innerJoin(documents, eq(sources.documentId, documents.id))
        .where(and(eq(sources.id, sourceId), eq(documents.userId, userId)));
    return source?.source || null;
}

// POST /sources/:documentId - Add a source by URL
sourcesRouter.post("/:documentId", async (c) => {
    const auth = c.get("auth");
    const userId = auth.userId;
    const documentId = c.req.param("documentId");

    return await Sentry.startSpan(
        { name: "POST /sources/:documentId", op: "http.server" },
        async () => {
            setOperationTags(c, { operation: "add_source", documentId });
            addOperationBreadcrumb(c, "Adding source to document", { documentId });

            // Verify document ownership
            const document = await verifyDocumentOwnership(documentId, userId);
            if (!document) {
                throw new NotFoundError("Document not found");
            }

            // Parse and validate request body
            const body = await c.req.json();
            const parsed = createSourceSchema.safeParse({ ...body, documentId });

            if (!parsed.success) {
                throw new ValidationError("Invalid request", parsed.error.flatten());
            }

            const { url, citationKey } = parsed.data;

            try {
                // Step 1: Scrape URL for metadata
                addOperationBreadcrumb(c, "Scraping URL", { url });
                const scraped = await scrapeUrl(url);

                // Step 2: Generate embedding from content
                let embedding: number[] | undefined;
                if (scraped.content && scraped.content.length > 0) {
                    addOperationBreadcrumb(c, "Generating embedding", { contentLength: scraped.content.length });
                    embedding = await Sentry.startSpan(
                        { name: "generateEmbedding", op: "ai.embedding" },
                        () => generateEmbedding(scraped.content!)
                    );
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
                addOperationBreadcrumb(c, "Saving source to database");
                const [inserted] = await db.insert(sources).values(sourceInsert).returning();

                return c.json(inserted, 201);
            } catch (error) {
                logger.error({ error, url, documentId }, "Failed to add source");
                throw error;
            }
        }
    );
});

// GET /sources/:documentId - List all sources for a document
sourcesRouter.get("/:documentId", async (c) => {
    const auth = c.get("auth");
    const userId = auth.userId;
    const documentId = c.req.param("documentId");

    // Verify document ownership
    const document = await verifyDocumentOwnership(documentId, userId);
    if (!document) {
        throw new NotFoundError("Document not found");
    }

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

    // Verify source ownership
    const source = await verifySourceOwnership(sourceId, userId);
    if (!source) {
        throw new NotFoundError("Source not found");
    }

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

    // Verify source ownership
    const source = await verifySourceOwnership(sourceId, userId);
    if (!source) {
        throw new NotFoundError("Source not found");
    }

    await db.delete(sources).where(eq(sources.id, sourceId));

    return c.body(null, 204);
});
