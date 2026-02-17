import { Hono } from "hono";
import { schema, eq, and } from "@/database";
import { authMiddleware } from "@/middleware/auth";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/errors";
import { Sentry } from "@/lib/sentry";
import { addOperationBreadcrumb, setOperationTags } from "@/middleware/sentry-context";
import { requireDocumentOwnership } from "@/utils/ownership";

import { createDocumentSchema } from "@shared/src/document";

const { documents } = schema;

export const documentsRouter = new Hono();

// POST /documents - Create a new document
documentsRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  return await Sentry.startSpan(
    { name: "POST /documents", op: "http.server" },
    async () => {
      const body = await c.req.json();
      const parsed = createDocumentSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError("Invalid request", parsed.error.flatten());
      }

      const { title, template, citationFormat } = parsed.data;

      // Generate document ID
      const documentId = crypto.randomUUID();

      setOperationTags(c, { operation: "create_document", documentId });
      addOperationBreadcrumb(c, "Creating new document", { documentId, title });

      // Create minimal Typst stub content
      const stubContent = `= ${title}\n\n`;

      // Upload stub file to R2 using storage service
      addOperationBreadcrumb(c, "Uploading stub to R2");
      await storageService.uploadDocument(userId, documentId, stubContent);

      // Build R2 key for database storage
      const typstKey = `documents/${userId}/${documentId}/main.typ`;

      // Create document in database
      addOperationBreadcrumb(c, "Saving document to database");
      const [document] = await db
        .insert(documents)
        .values({
          id: documentId,
          userId,
          title,
          template,
          typstKey,
          citationFormat,
        })
        .returning();

      return c.json(document);
    }
  );
});

// GET /documents - List user's documents
documentsRouter.get("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;

  const userDocuments = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId));

  return c.json(userDocuments);
});

// PATCH /documents/:id - Update document metadata
documentsRouter.patch("/:id", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("id");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId);

  const body = await c.req.json();
  const { title, template, citationFormat } = body;

  // Build update object with only provided fields
  const updates: Record<string, string> = {};
  if (title !== undefined) updates.title = title;
  if (template !== undefined) updates.template = template;
  if (citationFormat !== undefined) updates.citationFormat = citationFormat;

  // Update document
  const [updated] = await db
    .update(documents)
    .set(updates)
    .where(eq(documents.id, documentId))
    .returning();

  return c.json(updated);
});

// DELETE /documents/:id - Delete document
documentsRouter.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("id");

  return await Sentry.startSpan(
    { name: "DELETE /documents/:id", op: "http.server" },
    async () => {
      setOperationTags(c, { operation: "delete_document", documentId });
      addOperationBreadcrumb(c, "Deleting document", { documentId });

      // Verify ownership and get document
      const document = await requireDocumentOwnership(documentId, userId);

      // Delete from R2 using storage service
      try {
        addOperationBreadcrumb(c, "Deleting from R2");
        await storageService.deleteDocument(userId, documentId);
      } catch (error) {
        // Log error but continue with DB deletion
        logger.error({ error, documentId }, "Failed to delete from R2");
        Sentry.captureException(error, {
          tags: { operation: "r2_delete", documentId },
        });
      }

      // Delete from database
      addOperationBreadcrumb(c, "Deleting from database");
      await db
        .delete(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

      return c.body(null, 204);
    }
  );
});
