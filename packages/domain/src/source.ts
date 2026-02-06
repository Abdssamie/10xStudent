import { z } from "zod";

/**
 * @id: source-schemas
 * @priority: high
 * @progress: 100
 * @directive: Define Zod validation schemas for source operations
 * @context: specs/01-database-api-foundation.md#zod-schemas
 * @checklist: [
 *   "✅ Define createSourceSchema with documentId, url, title, author, publicationDate, content",
 *   "✅ Define updateSourceSchema with optional metadata fields",
 *   "✅ Validate URL format",
 *   "✅ Validate datetime format for publicationDate",
 *   "✅ Export TypeScript types inferred from schemas"
 * ]
 * @deps: []
 * @skills: ["zod", "typescript"]
 */

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
  publicationDate: z.string().datetime().optional(),
});

// Type inference
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
