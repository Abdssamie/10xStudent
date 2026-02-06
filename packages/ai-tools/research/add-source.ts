import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: add-source-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI tool schema for adding sources to documents
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'addSource'",
 *   "✅ Add inputSchema with documentId, url, title, content",
 *   "✅ Add outputSchema with sourceId and citationNumber",
 *   "✅ Add description for adding source and queuing embedding",
 *   "✅ Mark as server tool (executes on server)",
 *   "✅ Export tool definition for use in /api/chat"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const addSourceDef = toolDefinition({
  name: "addSource",
  description:
    "Add a source to the document and queue embedding generation for RAG. Returns the source ID and citation number.",
  inputSchema: z.object({
    documentId: z
      .string()
      .uuid()
      .describe("UUID of the document to add source to"),
    url: z.string().url().describe("URL of the source"),
    title: z.string().describe("Title of the source"),
    author: z.string().optional().describe("Author of the source (optional)"),
    publicationDate: z
      .string()
      .optional()
      .describe("Publication date (ISO 8601 format, optional)"),
    content: z
      .string()
      .describe("Full text content of the source for embedding generation"),
  }),
  outputSchema: z.object({
    sourceId: z.string().uuid().describe("UUID of the created source"),
    citationNumber: z
      .number()
      .describe("Citation number assigned to this source"),
  }),
});
