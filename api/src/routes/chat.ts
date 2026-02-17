import { Hono } from "hono";
import { z } from "zod";
import { chatMessageSchema } from "@shared/src/ai/chat-message";
import { ValidationError } from "@/lib/errors";

export const chatRouter = new Hono();

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message is required"),
});

// POST /chat - Stream chat response
chatRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const agentService = services.agentService;

  const body = await c.req.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError("Invalid request", parsed.error.message);
  }

  const { messages } = parsed.data;

  // Stream chat response with automatic credit handling
  return await agentService.streamChatResponse(userId, messages);
});
