import { z } from "zod";
import { chatMessageSchema } from "../ai/chat-message";

export const chatRequestBodySchema = z.object({
  documentId: z.string().uuid(),
  messages: z.array(chatMessageSchema).min(1),
});

export const chatMessageResponseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  createdAt: z.string().datetime(),
});
