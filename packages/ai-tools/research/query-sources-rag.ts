import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: query-sources-rag-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI tool schema for semantic search using pgvector RAG
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'querySourcesRAG'",
 *   "✅ Add inputSchema with documentId, query, topK",
 *   "✅ Add outputSchema with array of sources and similarity scores",
 *   "✅ Add description for semantic search functionality",
 *   "✅ Mark as server tool (executes on server)",
 *   "✅ Export tool definition for use in /api/chat"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const querySourcesRAGDef = toolDefinition({
  name: "querySourcesRAG",
  description:
    "Semantically search sources already added to the document using pgvector RAG. Returns most relevant sources with similarity scores.",
  inputSchema: z.object({
    documentId: z
      .string()
      .uuid()
      .describe("UUID of the document to search sources in"),
    query: z.string().describe("Search query for semantic similarity matching"),
    topK: z
      .number()
      .default(5)
      .describe("Number of top results to return (default: 5)"),
  }),
  outputSchema: z.array(
    z.object({
      sourceId: z.string().uuid().describe("UUID of the source"),
      title: z.string().describe("Title of the source"),
      content: z.string().describe("Content excerpt from the source"),
      similarity: z
        .number()
        .describe("Cosine similarity score (0-1, higher is more similar)"),
    }),
  ),
});
