import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "journal",
  "book",
  "conference",
  "report",
  "thesis",
  "website",
  "blog",
  "pdf",
  "image",
  "text",
  "asset",
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;
