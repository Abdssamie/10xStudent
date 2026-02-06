import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: replace-content-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI client tool schema for replacing text in CodeMirror
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'replaceContent'",
 *   "✅ Add inputSchema with from, to, and content",
 *   "✅ Add outputSchema with success boolean",
 *   "✅ Add description for replacing text range",
 *   "✅ Mark as client tool (executes in browser)",
 *   "✅ Export tool definition for use in client components"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const replaceContentDef = toolDefinition({
  name: "replaceContent",
  description:
    "Replace a range of text in the Typst document using CodeMirror transaction (preserves undo/redo)",
  inputSchema: z.object({
    from: z.number().describe("Start position (character index, 0-based)"),
    to: z.number().describe("End position (character index, 0-based)"),
    content: z.string().describe("New content to replace the range"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the replacement was successful"),
  }),
});
