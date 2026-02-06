import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: add-citation-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI client tool schema for inserting Typst citations
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'addCitation'",
 *   "✅ Add inputSchema with position, sourceId, citationNumber",
 *   "✅ Add outputSchema with success boolean",
 *   "✅ Add description explaining Typst footnote format: #footnote[N]",
 *   "✅ Mark as client tool (executes in browser)",
 *   "✅ Export tool definition for use in client components"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const addCitationDef = toolDefinition({
  name: "addCitation",
  description:
    "Insert a citation footnote in Typst format (#footnote[N]) at a specific position in the document",
  inputSchema: z.object({
    position: z.number().describe("Character position to insert citation"),
    sourceId: z.string().uuid().describe("UUID of the source being cited"),
    citationNumber: z.number().describe("Citation number for the footnote"),
  }),
  outputSchema: z.object({
    success: z
      .boolean()
      .describe("Whether the citation was inserted successfully"),
  }),
});
