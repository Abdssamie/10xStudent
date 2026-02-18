import { z } from "zod";

export const assetResponseSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  createdAt: z.string().datetime(),
});
