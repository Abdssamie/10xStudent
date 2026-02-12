import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const insertContentDef = toolDefinition({
  name: "insertContent",
  description:
    "Insert text at a specific position in a document file using CodeMirror transaction. Use this to add content to .typ or .bib files.",
  inputSchema: z.object({
    filePath: z
      .string()
      .describe("Path to the file to edit (e.g., 'main.typ', 'refs.bib')"),
    insertAfter: z
      .string()
      .describe("The exact line or content to insert after"),
    newContent: z.string().describe("Content to insert"),
    explanation: z
      .string()
      .describe("Optional explanation of the change for user feedback"),
  }),
  outputSchema: z.object({
    success: z
      .boolean()
      .describe("Whether the content was inserted successfully"),
  }),
});
