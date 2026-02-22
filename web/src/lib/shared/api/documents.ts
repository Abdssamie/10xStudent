import { z } from "zod";
import { createDocumentSchema, docTypeSchema, citationFormatSchema } from "../document";

export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  template: z.string(),
  docType: z.string(),
  typstKey: z.string(),
  citationFormat: z.string(),
  citationCount: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastAccessedAt: z.string().datetime(),
});

export const updateDocumentBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  template: z.string().optional(),
  docType: docTypeSchema.optional(),
  citationFormat: citationFormatSchema.optional(),
});

export const documentContentResponseSchema = z.object({
  content: z.string(),
});

export const updateDocumentContentBodySchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
});

export const bibliographyResponseSchema = z.object({
  bibliography: z.string(),
});

export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>;
export type DocumentContentResponse = z.infer<typeof documentContentResponseSchema>;
export type UpdateDocumentContentBody = z.infer<typeof updateDocumentContentBodySchema>;
export type BibliographyResponse = z.infer<typeof bibliographyResponseSchema>;

export { createDocumentSchema };
export type { CreateDocumentInput } from "../document";
