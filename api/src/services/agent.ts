import { chat, Tool, toServerSentEventsResponse } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-gemini";
import { serverTools } from "@/lib/ai/tools/server";
import { insertContentDef, replaceContentDef } from "@/lib/ai/tools/schemas";
import { env } from "@/config/env";
import { ChatMessage } from "@shared/src";
import { DB } from "@/database";
import { CreditManager } from "./credit-manager";

/**
 * Credit cost constants for AI operations
 */
const CREDIT_COSTS = {
  /**
   * Chat completion: 1 credit per 1000 tokens (minimum 1 credit)
   */
  CHAT_COMPLETION: (tokens: number): number =>
    Math.max(1, Math.ceil(tokens / 1000)),
} as const;

export class AgentService {
  adapter: ReturnType<typeof geminiText>;
  tools: Tool[];
  db: DB;
  creditManager: CreditManager;

  constructor(db: DB, creditManager: CreditManager) {
    this.db = db;
    this.creditManager = creditManager;

    // Initialize Gemini adapter
    this.adapter = geminiText("gemini-3-flash-preview", {
      apiKey: env.GOOGLE_API_KEY,
    });

    // Combine server tools (executable) and client tools (definitions only)
    this.tools = [
      ...serverTools,
      insertContentDef, // Client-side tool
      replaceContentDef, // Client-side tool
    ];
  }

  /**
   * Stream chat response with token tracking and credit deduction
   *
   * @param userId - The user ID for credit tracking
   * @param messages - Chat messages
   * @returns Server-Sent Events response stream
   * @throws Error if user has insufficient credits or stream fails
   */
  public async streamChatResponse(
    userId: string,
    messages: ChatMessage[],
  ): Promise<Response> {
    // Reserve estimated credits (1 credit upfront, will be adjusted after completion)
    const reservation = await this.creditManager.reserveCredits(userId, 1);

    let totalTokens = 0;

    const stream = chat({
      adapter: this.adapter,
      messages: messages,
      tools: this.tools,
    });

    // Wrap stream to capture token usage
    const self = this;
    async function* createTrackedStream() {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "RUN_FINISHED" && chunk.usage) {
            totalTokens = chunk.usage.totalTokens;
          }
          yield chunk;
        }

        // Once the loop is done, we have the totalTokens!
        if (totalTokens > 0) {
          const actualCost = CREDIT_COSTS.CHAT_COMPLETION(totalTokens);
          await self.creditManager.finalizeCredits(
            userId,
            "chat_completion",
            reservation.reservedAmount,
            actualCost,
            totalTokens,
          );
        } else {
          // No tokens used, rollback the reserved credit
          await self.creditManager.rollbackCredits(
            userId,
            reservation.reservedAmount,
          );
        }
      } catch (err) {
        await self.creditManager.rollbackCredits(
          userId,
          reservation.reservedAmount,
        );
        throw err;
      }
    }

    return toServerSentEventsResponse(createTrackedStream());
  }
}
