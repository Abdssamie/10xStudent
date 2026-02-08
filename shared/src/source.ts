import { z } from "zod";

// Create source schema
export const createSourceSchema = z.object({
  documentId: z.string().uuid("Invalid document ID format"),
  url: z.string().url("Invalid URL format"),
  title: z.string().optional(),
  author: z.string().optional(),
  publicationDate: z.string().datetime("Invalid datetime format").optional(),
  content: z.string().optional(),
});

// Update source schema (metadata fields only)
export const updateSourceSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  publicationDate: z.string().datetime(),
});

// Type inference
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
