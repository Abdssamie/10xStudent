import { z } from "zod";

/**
 * @id: document-schemas
 * @priority: high
 * @progress: 100
 * @directive: Define Zod validation schemas for document operations
 * @context: specs/01-database-api-foundation.md#zod-schemas
 * @checklist: [
 *   "✅ Define templateSchema enum (research-paper, report, essay, article, notes)",
 *   "✅ Define citationFormatSchema enum (APA, MLA, Chicago)",
 *   "✅ Define createDocumentSchema with title, typstContent, template, citationFormat",
 *   "✅ Define updateDocumentSchema with optional fields",
 *   "✅ Enforce max 100000 chars for typstContent (~1000 lines)",
 *   "✅ Export TypeScript types inferred from schemas"
 * ]
 * @deps: []
 * @skills: ["zod", "typescript"]
 */

// Template enum schema
export const templateSchema = z.enum([
  "research-paper",
  "report",
  "essay",
  "article",
  "notes",
]);

// Citation format enum schema
export const citationFormatSchema = z.enum(["APA", "MLA", "Chicago"]);

// Create document schema
export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  r2Key: z.string().min(1),
  template: templateSchema,
  citationFormat: citationFormatSchema.default("APA"),
});

// Update document schema (all fields optional)
export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  typstContent: z.string().max(100000).optional(),
  citationFormat: citationFormatSchema.optional(),
});

// Type inference
export type Template = z.infer<typeof templateSchema>;
export type CitationFormat = z.infer<typeof citationFormatSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
