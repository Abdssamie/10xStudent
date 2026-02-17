import { Hono } from "hono";
import { db, schema, eq, and } from "@/database";
import { buildR2Key } from "@/services/r2-storage";
import { authMiddleware } from "@/middleware/auth";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME } from "@/services/r2-client";

import { createDocumentSchema } from "@shared/src/document";

const { documents } = schema;

export const documentsRouter = new Hono();

// POST /documents - Create a new document
documentsRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;

  const body = await c.req.json();
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400
    );
  }

  const { title, template, citationFormat } = parsed.data;

  // Generate document ID and R2 key
  const documentId = crypto.randomUUID();
  const typstKey = buildR2Key(userId, documentId);

  // Create minimal Typst stub content
  const stubContent = `= ${title}\n\n`;

  // Upload stub file to R2
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: typstKey,
      Body: stubContent,
      ContentType: "text/plain",
    }),
  );

  // Create document in database
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
    return c.json({ error: "Document not found" }, 404);
  }

  return c.json(updated);
});

// DELETE /documents/:id - Delete document
documentsRouter.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("id");

  // Get document to retrieve R2 key
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  if (!document) {
    return c.json({ error: "Document not found" }, 404);
  }

  // Delete from R2
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: document.typstKey,
      }),
    );
  } catch (error) {
    // Log error but continue with DB deletion
    console.error("Failed to delete from R2:", error);
  }

  // Delete from database
  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  return c.body(null, 204);
});
