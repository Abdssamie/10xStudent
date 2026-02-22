import { z } from "zod";


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

// Document type schema
export const docTypeSchema = z.enum(["a4", "us-letter", "auto"]);

// Create document schema (with defaults for API)
export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  template: templateSchema,
  docType: docTypeSchema.default("a4"),
  citationFormat: citationFormatSchema.default("APA"),
});

// Create document form schema (required fields for form validation)
export const createDocumentFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  template: templateSchema,
  docType: docTypeSchema,
  citationFormat: citationFormatSchema,
});

// Update document schema (all fields optional)
export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  typstContent: z.string().max(100000).optional(),
  docType: docTypeSchema.optional(),
  citationFormat: citationFormatSchema.optional(),
});

// Type inference
export type Template = z.infer<typeof templateSchema>;
export type CitationFormat = z.infer<typeof citationFormatSchema>;
export type DocType = z.infer<typeof docTypeSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateDocumentFormInput = z.infer<typeof createDocumentFormSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
