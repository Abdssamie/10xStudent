// TODO: Convert to integration test with TestContainers
// - Spin up PostgreSQL container
// - Use real database instead of mocks
// - Test actual credit deduction and rollback
// - Use real Gemini API or mock server instead of vi.mock
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentService } from "../../src/services/agent";
import { CreditManager } from "../../src/services/credit-manager";

// Mock environment variables
vi.mock("@/config/env", () => ({
  env: {
    GOOGLE_API_KEY: "test-api-key",
  },
}));

// Mock TanStack AI
const mockChat = vi.fn();

vi.mock("@tanstack/ai", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/ai")>("@tanstack/ai");
  return {
    ...actual,
    chat: (...args: unknown[]) => mockChat(...args),
  };
});

vi.mock("@tanstack/ai-gemini", () => ({
  geminiText: vi.fn(() => ({})),
}));

// Mock tools
vi.mock("@/lib/tools/server", () => ({
  serverTools: [],
}));

vi.mock("@/lib/tools/schemas", () => ({
  insertContentDef: { name: "insertContent" },
  replaceContentDef: { name: "replaceContent" },
}));

describe("AgentService", () => {
  let agentService: AgentService;
  let mockCreditManager: CreditManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock CreditManager
    mockCreditManager = {
      reserveCredits: vi.fn(),
      finalizeCredits: vi.fn(),
      rollbackCredits: vi.fn(),
    } as unknown as CreditManager;

    agentService = new AgentService({} as typeof import("@/database").db, mockCreditManager);
  });

  describe("streamChatResponse", () => {
    it("should reserve credits before streaming", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Hello" }];

      // Setup reservation mock
      vi.mocked(mockCreditManager.reserveCredits).mockResolvedValue({
        userId,
        reservedAmount: 1,
        remainingCredits: 999,
      });

      // Setup stream mock
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          finishReason: "stop",
        };
      };

      mockChat.mockReturnValue(mockStream());

      await agentService.streamChatResponse(userId, messages);

      expect(mockCreditManager.reserveCredits).toHaveBeenCalledWith(userId, 1);
    });

    it("should deduct credits based on token usage after successful completion", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Hello" }];

      vi.mocked(mockCreditManager.reserveCredits).mockResolvedValue({
        userId,
        reservedAmount: 1,
        remainingCredits: 999,
      });

      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
          finishReason: "stop",
        };
      };

      mockChat.mockReturnValue(mockStream());

      // Get the response and consume the stream
      const response = await agentService.streamChatResponse(userId, messages);
      await consumeStream(response);

      // 1000 tokens = 1 credit (1000/1000 = 1)
      expect(mockCreditManager.finalizeCredits).toHaveBeenCalledWith(
        userId,
        "chat_completion",
        1,
        1,
        1000
      );
    });

    it("should charge minimum 1 credit even for small token usage", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Hi" }];

      vi.mocked(mockCreditManager.reserveCredits).mockResolvedValue({
        userId,
        reservedAmount: 1,
        remainingCredits: 999,
      });

      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hi" };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          finishReason: "stop",
        };
      };

      mockChat.mockReturnValue(mockStream());

      const response = await agentService.streamChatResponse(userId, messages);
      await consumeStream(response);

      // Minimum 1 credit even for 10 tokens
      expect(mockCreditManager.finalizeCredits).toHaveBeenCalledWith(
        userId,
        "chat_completion",
        1,
        1,
        10
      );
    });

    it("should calculate multiple credits for large token usage", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Write a long essay" }];

      vi.mocked(mockCreditManager.reserveCredits).mockResolvedValue({
        userId,
        reservedAmount: 1,
        remainingCredits: 999,
      });

      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Essay..." };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 },
          finishReason: "stop",
        };
      };

      mockChat.mockReturnValue(mockStream());

      const response = await agentService.streamChatResponse(userId, messages);
      await consumeStream(response);

      // 3000 tokens = 3 credits (3000/1000 = 3)
      expect(mockCreditManager.finalizeCredits).toHaveBeenCalledWith(
        userId,
        "chat_completion",
        1,
        3,
        3000
      );
    });

    it("should rollback credits when stream throws an error", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Hello" }];

      vi.mocked(mockCreditManager.reserveCredits).mockResolvedValue({
        userId,
        reservedAmount: 1,
        remainingCredits: 999,
      });

      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        throw new Error("Stream error");
      };

      mockChat.mockReturnValue(mockStream());

      await agentService.streamChatResponse(userId, messages);
      
      // Wait a bit for the async generator to process and hit the error
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should rollback reserved credits on error
      expect(mockCreditManager.rollbackCredits).toHaveBeenCalledWith(userId, 1);
      expect(mockCreditManager.finalizeCredits).not.toHaveBeenCalled();
    });

    it("should refund credits when no tokens are used", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Hello" }];

      vi.mocked(mockCreditManager.reserveCredits).mockResolvedValue({
        userId,
        reservedAmount: 1,
        remainingCredits: 999,
      });

      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        yield {
          type: "RUN_FINISHED",
          usage: undefined, // No usage data
          finishReason: "error",
        };
      };

      mockChat.mockReturnValue(mockStream());

      const response = await agentService.streamChatResponse(userId, messages);
      await consumeStream(response);

      // Should rollback since no tokens were used
      expect(mockCreditManager.rollbackCredits).toHaveBeenCalledWith(userId, 1);
      expect(mockCreditManager.finalizeCredits).not.toHaveBeenCalled();
    });

    it("should throw error when user has insufficient credits", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const messages = [{ role: "user" as const, content: "Hello" }];

      vi.mocked(mockCreditManager.reserveCredits).mockRejectedValue(
        new Error("Insufficient credits. Have: 0, Need: 1")
      );

      await expect(agentService.streamChatResponse(userId, messages)).rejects.toThrow(
        "Insufficient credits"
      );
    });
  });
});

/**
 * Helper function to consume a Response stream
 */
async function consumeStream(response: Response): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No body reader available");
  }

  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}
