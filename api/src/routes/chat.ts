import { Hono } from "hono";
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-gemini";
import { serverTools } from "@/lib/tools/server";
import { insertContentDef, replaceContentDef } from "@/lib/tools/schemas";
import { env } from "@/config/env";

export const chatRouter = new Hono();

/**
 * Build system prompt for AI chat that enforces citation accuracy
 * Kept for testing compatibility
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

chatRouter.post("/", async (c) => {
  const { messages } = await c.req.json();

  // Initialize Gemini adapter
  const adapter = geminiText("gemini-3-flash-preview", {
    apiKey: env.GOOGLE_API_KEY
  });

  // Combine server tools (executable) and client tools (definitions only)
  const tools = [
    ...serverTools,
    insertContentDef, // Client-side tool
    replaceContentDef // Client-side tool
  ];

  const stream = chat({
    adapter,
    messages,
    tools,
  });

  return toServerSentEventsResponse(stream);
});
