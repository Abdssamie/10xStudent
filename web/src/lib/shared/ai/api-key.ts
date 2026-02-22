import { z } from "zod";

export const apiKeySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1).max(100),
  keyHash: z.string(),
  lastUsedAt: z.date().nullable(),
});

export type ApiKey = z.infer<typeof apiKeySchema>;

