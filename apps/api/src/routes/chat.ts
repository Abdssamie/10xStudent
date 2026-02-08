import { Hono } from "hono";
import { rateLimitMiddleware } from "@/middleware/rate-limit";
import { checkAiCreditsMiddleware } from "@/middleware/credits";

export const chatRouter = new Hono();

// Apply rate limiting: 10 requests per minute
chatRouter.use("/", rateLimitMiddleware(10, 60000));

// Apply credits check: block AI endpoints when credits are exhausted
chatRouter.use("/", checkAiCreditsMiddleware);

/**
 * Build system prompt for AI chat that enforces citation accuracy
 */
export function buildSystemPrompt(): string {
  return `You are an academic writing assistant helping students write research papers with proper citations.

CITATION RULES (CRITICAL):
- Only cite claims present in sources provided to you
- Use @citation-key format for all citations (e.g., @einstein1905)
- Never hallucinate or invent sources that were not provided
- Every factual claim must be supported by a citation
- Prefer recent sources when multiple sources support the same claim
- If you cannot find a source to support a claim, say so explicitly

CITATION FORMAT:
- Use @citation-key immediately after the claim (e.g., "The theory of relativity @einstein1905 revolutionized physics")
- Multiple citations: @key1 @key2 @key3
- Do not use numbered citations like [1] or (1)

WRITING GUIDELINES:
- Write in clear, academic prose
- Help students develop their arguments
- Suggest improvements to structure and clarity
- Maintain academic integrity at all times

Remember: Citation accuracy is paramount. Never cite a source that was not provided to you.`;
}

// TODO: Implement chat endpoint in Phase 2
// This will be the single /api/chat endpoint for TanStack AI
//
// TOKEN-EFFICIENT TOOLS TO USE:
// When implementing this endpoint with TanStack AI, use these tools:
//
// 1. searchAndAddSources(query: string, documentId: string, maxResults?: number)
//    - For finding and adding new sources to the document
//    - AI provides search query, backend handles: search, fetch, embed, save
//    - Returns: minimal metadata (source IDs, titles, snippets)
//    - maxResults defaults to 5 if not specified
//
// 2. querySourcesRAG(query: string, documentId: string, topK?: number)
//    - For querying existing sources in the document
//    - AI provides query, backend handles: vector search, retrieval
//    - Returns: minimal metadata (sourceId, title, excerpt, similarity)
//    - topK defaults to 5 if not specified
//
// WHY THESE TOOLS ARE TOKEN-EFFICIENT:
// - AI only provides queries (strings), not full content
// - Backend handles all heavy lifting (search, fetch, embed, save, vector search)
// - Tools return minimal metadata instead of full documents
// - Reduces token usage in both requests and responses
// - Keeps context window focused on chat and citations, not raw content
//
chatRouter.post("/", async (c) => {
  return c.json({ error: "Chat endpoint not yet implemented" }, 501);
});
