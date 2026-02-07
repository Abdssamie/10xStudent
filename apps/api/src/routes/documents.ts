import { Hono } from "hono";
import { db, schema } from "@10xstudent/database";
import { buildR2Key } from "@/services/r2-storage";
import { authMiddleware } from "@/middleware/auth";

const { documents } = schema;

export const documentsRouter = new Hono();

// Apply auth middleware to all routes
documentsRouter.use("/*", authMiddleware);

// POST /documents - Create a new document
documentsRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;

  const body = await c.req.json();
  const { title, template } = body;

  // Generate a temporary document ID for building the R2 key
  // In production, we'd use the actual ID from the database
  const tempDocId = crypto.randomUUID();
  const typstKey = buildR2Key(userId, tempDocId);

  // Create document in database
  const [document] = await db
    .insert(documents)
    .values({
      userId,
      title,
      template,
      typstKey,
      citationFormat: "APA",
    })
    .returning();

  return c.json(document);
});

// GET /documents - List documents (stub)
documentsRouter.get("/", async (c) => {
  return c.json({ message: "Not implemented" }, 501);
});

// PATCH /documents/:id - Update document (stub)
documentsRouter.patch("/:id", async (c) => {
  return c.json({ message: "Not implemented" }, 501);
});

// DELETE /documents/:id - Delete document (stub)
documentsRouter.delete("/:id", async (c) => {
  return c.json({ message: "Not implemented" }, 501);
});
