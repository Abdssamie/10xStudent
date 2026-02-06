import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: web-search-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI tool schema for web search using Tavily API
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'webSearch'",
 *   "✅ Add inputSchema with query and maxResults",
 *   "✅ Add outputSchema with array of search results",
 *   "✅ Add description for web search functionality",
 *   "✅ Mark as server tool (executes on server)",
 *   "✅ Export tool definition for use in /api/chat"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const webSearchDef = toolDefinition({
  name: "webSearch",
  description:
    "Search the web for relevant sources on a topic using Tavily API. Returns URLs, titles, and content snippets.",
  inputSchema: z.object({
    query: z.string().describe("Search query to find relevant sources"),
    maxResults: z
      .number()
      .default(5)
      .describe("Maximum number of results to return (3-15, default: 5)"),
  }),
  outputSchema: z.array(
    z.object({
      url: z.string().describe("URL of the source"),
      title: z.string().describe("Title of the source"),
      snippet: z.string().describe("Short excerpt from the source"),
      content: z.string().describe("Full extracted content from the source"),
    }),
  ),
});
