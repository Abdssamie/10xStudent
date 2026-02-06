import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: get-next-citation-number-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI tool schema for atomic citation counter increment
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'getNextCitationNumber'",
 *   "✅ Add inputSchema with documentId",
 *   "✅ Add outputSchema with citationNumber",
 *   "✅ Add description explaining atomic increment",
 *   "✅ Mark as server tool (executes on server)",
 *   "✅ Export tool definition for use in /api/chat"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const getNextCitationNumberDef = toolDefinition({
  name: "getNextCitationNumber",
  description:
    "Get the next citation number for a document (atomically increments the document's citation counter)",
  inputSchema: z.object({
    documentId: z.string().uuid().describe("UUID of the document"),
  }),
  outputSchema: z.object({
    citationNumber: z.number().describe("The next citation number to use"),
  }),
});
