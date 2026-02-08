import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const replaceContentDef = toolDefinition({
  name: "replaceContent",
  description:
    "Replace a range of text in the Typst document using CodeMirror transaction (preserves undo/redo)",
  inputSchema: z.object({
    oldContent: z.string().describe("Existing content to be replaced"),
    newContent: z
      .string()
      .describe("New content to replace the old content with"),
    explanation: z
      .string()
      .describe("Optional explanation of the change for user feedback"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the replacement was successful"),
  }),
});
