import { Hono } from "hono";
import { z } from "zod";
import { chatMessageSchema } from "@shared/src/ai/chat-message";
import { ValidationError, NotFoundError, ForbiddenError } from "@/infrastructure/errors";
import { schema, eq, and } from "@/infrastructure/db";

const { documents } = schema;

export const chatRouter = new Hono();

const chatRequestSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  messages: z.array(chatMessageSchema).min(1, "At least one message is required"),
});

// POST /chat - Stream chat response
chatRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const agentService = services.agentService;
  const db = services.db;

  const body = await c.req.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError("Invalid request", parsed.error.message);
  }

  const { documentId, messages } = parsed.data;

  // Verify document ownership
  const document = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);

  if (!document[0]) {
    throw new NotFoundError("Document not found");
  }

  // Stream chat response with automatic credit handling and persistence
  return await agentService.streamChatResponse(userId, documentId, messages);
});

// GET /chat/:documentId - Get chat history for a document
chatRouter.get("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;
  const documentId = c.req.param("documentId");

  // Verify document ownership
  const document = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);

  if (!document[0]) {
    throw new NotFoundError("Document not found");
  }

  // Get chat history
  const messages = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.documentId, documentId))
    .orderBy(schema.chatMessages.createdAt);

  return c.json(messages);
});
