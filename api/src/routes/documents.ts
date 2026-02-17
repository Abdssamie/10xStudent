import { Hono } from "hono";
import { db, schema, eq, and } from "@/database";
import { buildR2Key } from "@/services/r2-storage";
import { authMiddleware } from "@/middleware/auth";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME } from "@/services/r2-client";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/errors";
import { Sentry } from "@/lib/sentry";
import { addOperationBreadcrumb, setOperationTags } from "@/middleware/sentry-context";

import { createDocumentSchema } from "@shared/src/document";

const { documents } = schema;

export const documentsRouter = new Hono();

// POST /documents - Create a new document
documentsRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;

  return await Sentry.startSpan(
    { name: "POST /documents", op: "http.server" },
    async () => {
      const body = await c.req.json();
      const parsed = createDocumentSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError("Invalid request", parsed.error.flatten());
      }

      const { title, template, citationFormat } = parsed.data;

      // Generate document ID and R2 key
      const documentId = crypto.randomUUID();
      const typstKey = buildR2Key(userId, documentId);

      setOperationTags(c, { operation: "create_document", documentId });
      addOperationBreadcrumb(c, "Creating new document", { documentId, title });

      // Create minimal Typst stub content
      const stubContent = `= ${title}\n\n`;

      // Upload stub file to R2
      addOperationBreadcrumb(c, "Uploading stub to R2", { typstKey });
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: typstKey,
          Body: stubContent,
          ContentType: "text/plain",
        }),
      );

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

  const body = await c.req.json();
  const { title, template, citationFormat } = body;

  // Build update object with only provided fields
  const updates: Record<string, string> = {};
  if (title !== undefined) updates.title = title;
  if (template !== undefined) updates.template = template;
  if (citationFormat !== undefined) updates.citationFormat = citationFormat;

  // Update document (only if owned by user)
  const [updated] = await db
    .update(documents)
    .set(updates)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .returning();

  if (!updated) {
    throw new NotFoundError("Document not found");
  }

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

      // Get document to retrieve R2 key
      const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

      if (!document) {
        throw new NotFoundError("Document not found");
      }

      // Delete from R2
      try {
        addOperationBreadcrumb(c, "Deleting from R2", { typstKey: document.typstKey });
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: document.typstKey,
          }),
        );
      } catch (error) {
        // Log error but continue with DB deletion
        logger.error({ error, documentId, typstKey: document.typstKey }, "Failed to delete from R2");
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
