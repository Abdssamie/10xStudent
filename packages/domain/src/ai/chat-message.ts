import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
