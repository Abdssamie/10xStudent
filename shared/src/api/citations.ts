import { z } from "zod";

export const createCitationBodySchema = z.object({
  sourceId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const citationResponseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  sourceId: z.string().uuid(),
  citationNumber: z.number(),
  position: z.number(),
  createdAt: z.string().datetime(),
});
