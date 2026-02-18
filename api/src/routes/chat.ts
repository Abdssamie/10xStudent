import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { chatRequestBodySchema, chatMessageResponseSchema } from "@shared/src/api/chat";

import { schema, eq, and } from "@/infrastructure/db";
import { NotFoundError } from "@/infrastructure/errors";

const { documents } = schema;

export const chatRouter = new OpenAPIHono();

const streamChatRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: chatRequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "text/event-stream": {
          schema: z.any(),
        },
      },
      description: "Streaming chat response",
    },
  },
  tags: ["Chat"],
});

chatRouter.openapi(streamChatRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const agentService = services.agentService;
  const db = services.db;

  const { documentId, messages } = c.req.valid("json");

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

const getChatHistoryRoute = createRoute({
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
          schema: z.array(chatMessageResponseSchema),
        },
      },
      description: "Chat message history for document",
    },
  },
  tags: ["Chat"],
});

chatRouter.openapi(getChatHistoryRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;
  const { documentId } = c.req.valid("param");

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
