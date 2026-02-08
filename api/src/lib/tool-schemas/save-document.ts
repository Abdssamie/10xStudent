import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const saveDocumentDef = toolDefinition({
  name: "saveDocument",
  description:
    "Save document content to database (updates typstContent and updatedAt timestamp)",
  inputSchema: z.object({
    documentId: z.uuid().describe("UUID of the document to save"),
    typstContent: z
      .string()
      .describe("Typst content to save (max 100,000 characters)"),
  }),
  outputSchema: z.object({
    success: z
      .boolean()
      .describe("Whether the document was saved successfully"),
  }),
});
