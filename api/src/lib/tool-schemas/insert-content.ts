import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const insertContentDef = toolDefinition({
  name: "insertContent",
  description:
    "Insert text at a specific position in the Typst document using CodeMirror transaction",
  inputSchema: z.object({
    explanation: z
      .string()
      .describe("Optional explanation of the change for user feedback"),
    insertAfter: z.string().describe("The exact line or content to insert after"),
    newContent: z.string().describe("Content to insert"),
  }),
  outputSchema: z.object({
    success: z
      .boolean()
      .describe("Whether the content was inserted successfully"),
  }),
});
