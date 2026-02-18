import { z } from "zod";
import { createDocumentSchema } from "../document";

export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  template: z.string(),
  typstKey: z.string(),
  citationFormat: z.string(),
  citationCount: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const updateDocumentBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  template: z.string().optional(),
  citationFormat: z.enum(["APA", "MLA", "Chicago"]).optional(),
});

export { createDocumentSchema };
