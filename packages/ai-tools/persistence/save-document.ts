import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: save-document-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI tool schema for saving document content
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'saveDocument'",
 *   "✅ Add inputSchema with documentId and typstContent",
 *   "✅ Add outputSchema with success boolean",
 *   "✅ Add description for persisting document to database",
 *   "✅ Mark as server tool (executes on server)",
 *   "✅ Export tool definition for use in /api/chat"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const saveDocumentDef = toolDefinition({
  name: "saveDocument",
  description:
    "Save document content to database (updates typstContent and updatedAt timestamp)",
  inputSchema: z.object({
    documentId: z.string().uuid().describe("UUID of the document to save"),
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
