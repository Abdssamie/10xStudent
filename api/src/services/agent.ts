import { chat, Tool, toServerSentEventsResponse } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-gemini";
import { serverTools } from "@/services/tools/server";
import { insertContentDef, replaceContentDef } from "@/services/tools/schemas";
import { env } from "@/config/env";
import { ChatMessage } from "@shared";
import { DB, schema } from "@/infrastructure/db";
import { CreditManager } from "./credit-manager";
import { logger } from "@/utils/logger";

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

/**
 * Tool call structure for persistence
 */
interface ToolCallData {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

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
   * Persist a chat message to the database
   *
   * @param documentId - The document ID this message belongs to
   * @param role - The message role (user, assistant, tool)
   * @param content - The message content
   * @param toolCalls - Optional tool calls for assistant messages
   * @param toolCallId - Optional tool call ID for tool messages
   * @returns The persisted message
   */
  private async persistMessage(
    documentId: string,
    role: "user" | "assistant" | "tool",
    content: string,
    toolCalls?: ToolCallData[],
    toolCallId?: string,
  ): Promise<typeof schema.chatMessages.$inferSelect> {
    const [message] = await this.db
      .insert(schema.chatMessages)
      .values({
        documentId,
        role,
        content,
        toolCalls: toolCalls || null,
        toolCallId: toolCallId || null,
      })
      .returning();

    if (!message) {
      throw new Error("Failed to persist chat message");
    }

    logger.info({ documentId, role, messageId: message.id }, "Chat message persisted");
    return message;
  }

  /**
   * Get the last user message from the messages array
   */
  private getLastUserMessage(messages: ChatMessage[]): ChatMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message && message.role === "user") {
        return message;
      }
    }
    return null;
  }

  /**
   * Stream chat response with token tracking, credit deduction, and persistence
   *
   * @param userId - The user ID for credit tracking
   * @param documentId - The document ID for chat persistence
   * @param messages - Chat messages
   * @returns Server-Sent Events response stream
   * @throws Error if user has insufficient credits or stream fails
   */
  public async streamChatResponse(
    userId: string,
    documentId: string,
    messages: ChatMessage[],
  ): Promise<Response> {
    // Reserve estimated credits (1 credit upfront, will be adjusted after completion)
    const reservation = await this.creditManager.reserveCredits(userId, 1);

    // Persist the latest user message before processing
    const lastUserMessage = this.getLastUserMessage(messages);
    if (lastUserMessage) {
      await this.persistMessage(documentId, "user", lastUserMessage.content);
    }

    let totalTokens = 0;
    let assistantContent = "";
    const toolCalls: ToolCallData[] = [];

    const stream = chat({
      adapter: this.adapter,
      messages: messages,
      tools: this.tools,
    });

    // Wrap stream to capture token usage
    const createTrackedStream = (async function* (this: AgentService) {
      let totalTokens = 0;
      try {
        for await (const chunk of stream) {
          // Capture assistant content from text chunks
          if (chunk.type === "TEXT_MESSAGE_CONTENT") {
            const contentChunk = chunk as { type: "TEXT_MESSAGE_CONTENT"; delta: string; content?: string };
            assistantContent += contentChunk.delta || "";
          }

          // Capture tool calls when they complete
          if (chunk.type === "TOOL_CALL_END") {
            const toolChunk = chunk as { 
              type: "TOOL_CALL_END"; 
              toolCallId: string; 
              toolName: string; 
              input?: unknown;
            };
            toolCalls.push({
              id: toolChunk.toolCallId,
              name: toolChunk.toolName,
              arguments: (toolChunk.input as Record<string, unknown>) || {},
            });
          }

          // Capture token usage from run finished event
          if (chunk.type === "RUN_FINISHED") {
            const finishedChunk = chunk as { 
              type: "RUN_FINISHED"; 
              usage?: { 
                promptTokens: number; 
                completionTokens: number; 
                totalTokens: number;
              };
            };
            if (finishedChunk.usage) {
              totalTokens = finishedChunk.usage.totalTokens;
            }
          }
          yield chunk;
        }

        // Once the loop is done, persist the assistant's response
        if (assistantContent || toolCalls.length > 0) {
          await this.persistMessage(
            documentId,
            "assistant",
            assistantContent,
            toolCalls.length > 0 ? toolCalls : undefined,
          );
        }

        // Handle credit finalization
        if (totalTokens > 0) {
          const actualCost = CREDIT_COSTS.CHAT_COMPLETION(totalTokens);
          await this.creditManager.finalizeCredits(
            userId,
            "chat_completion",
            reservation.reservedAmount,
            actualCost,
            totalTokens,
          );
        } else {
          // No tokens used, rollback the reserved credit
          await this.creditManager.rollbackCredits(
            userId,
            reservation.reservedAmount,
          );
        }
      } catch (err) {
        await this.creditManager.rollbackCredits(
          userId,
          reservation.reservedAmount,
        );
        throw err;
      }
    }).bind(this);

    return toServerSentEventsResponse(createTrackedStream());
  }

  /**
   * Persist a tool result message
   *
   * @param documentId - The document ID
   * @param toolCallId - The tool call ID this result is for
   * @param content - The tool result content
   * @returns The persisted message
   */
  public async persistToolResult(
    documentId: string,
    toolCallId: string,
    content: string,
  ): Promise<typeof schema.chatMessages.$inferSelect> {
    return this.persistMessage(documentId, "tool", content, undefined, toolCallId);
  }
}
