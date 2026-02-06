import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: insert-content-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI client tool schema for inserting text in CodeMirror
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'insertContent'",
 *   "✅ Add inputSchema with position and content",
 *   "✅ Add outputSchema with success boolean",
 *   "✅ Add description for inserting text at position",
 *   "✅ Mark as client tool (executes in browser)",
 *   "✅ Export tool definition for use in client components"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const insertContentDef = toolDefinition({
  name: "insertContent",
  description:
    "Insert text at a specific position in the Typst document using CodeMirror transaction",
  inputSchema: z.object({
    position: z
      .number()
      .describe("Character position to insert content (0-based index)"),
    content: z.string().describe("Content to insert"),
  }),
  outputSchema: z.object({
    success: z
      .boolean()
      .describe("Whether the content was inserted successfully"),
  }),
});
