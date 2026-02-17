import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { AgentService } from "@/services/agent";
import { CreditManager } from "@/services/credit-manager";
import { TestDatabaseService } from "../helpers/test-database-service";

// Mock external AI services (keep these mocked to avoid API costs)
vi.mock("@tanstack/ai", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/ai")>("@tanstack/ai");
  return {
    ...actual,
    chat: vi.fn(),
  };
});

vi.mock("@tanstack/ai-gemini", () => ({
  geminiText: vi.fn(() => ({})),
}));

// Mock tools (not testing tool execution here)
vi.mock("@/lib/tools/server", () => ({
  serverTools: [],
}));

vi.mock("@/lib/tools/schemas", () => ({
  insertContentDef: { name: "insertContent" },
  replaceContentDef: { name: "replaceContent" },
}));

// Mock environment (required for AgentService initialization)
vi.mock("@/config/env", () => ({
  env: {
    GOOGLE_API_KEY: "test-api-key",
  },
}));

describe("AgentService Integration Tests", () => {
  let testDb: TestDatabaseService;
  let agentService: AgentService;
  let creditManager: CreditManager;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    // Create fresh database service for this test file
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    
    // Clean database before each test
    await testDb.cleanDatabase();
    
    // Seed test user with credits
    await testDb.seedTestUser(testUserId, 1000);
    
    // Create real instances with this test file's database
    creditManager = new CreditManager(testDb.getDb());
    agentService = new AgentService(testDb.getDb(), creditManager);
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Close this test file's database connection
    if (testDb) {
      await testDb.close();
    }
  });

  describe("streamChatResponse with real database", () => {
    it("should reserve credits before streaming and finalize after", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Hello" }];
      
      // Mock the chat stream
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
          finishReason: "stop",
        };
      };
      
      const { chat } = await import("@tanstack/ai");
      vi.mocked(chat).mockReturnValue(mockStream());

      // Act
      const response = await agentService.streamChatResponse(testUserId, messages);
      await consumeStream(response);

      // Assert - Check real database state
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(999); // 1000 - 1 credit (1000 tokens)

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.operation).toBe("chat_completion");
      expect(logs[0]?.cost).toBe(1);
      expect(logs[0]?.tokensUsed).toBe(1000);
    });

    it("should charge minimum 1 credit for small token usage", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Hi" }];
      
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hi" };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          finishReason: "stop",
        };
      };
      
      const { chat } = await import("@tanstack/ai");
      vi.mocked(chat).mockReturnValue(mockStream());

      // Act
      const response = await agentService.streamChatResponse(testUserId, messages);
      await consumeStream(response);

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(999); // Minimum 1 credit

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs[0]?.cost).toBe(1);
      expect(logs[0]?.tokensUsed).toBe(10);
    });

    it("should calculate multiple credits for large token usage", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Write a long essay" }];
      
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Essay..." };
               type: "RUN_FINISHED",
          usage: { promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 },
          finishReason: "stop",
        };
      };
      
      const { chat } = await import("@tanstack/ai");
      vi.mocked(chat).mockReturnValue(mockStream());

      // Act
      const response = await agentService.streamChatResponse(testUserId, messages);
      await consumeStream(response);

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(997); // 1000 - 3 credits (3000 tokens)

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs[0]?.cost).toBe(3);
      expect(logs[0]?.tokensUsed).toBe(3000);
    });

    it("should rollback credits when stream throws an error", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Hello" }];
      
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        throw new Error("Stream error");
      };
      
      const { chat } = await import("@tanstack/ai");
      vi.mocked(chat).mockReturnValue(mockStream());

      // Act
      const response = await agentService.streamChatResponse(testUserId, messages);
      
      // Try to consume stream (will fail)
      try {
        await consumeStream(response);
      } catch (error) {
        // Expected to fail
      }

      // Wait for async rollback to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Credits should be rolled back
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(1000); // Rolled back

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0); // No l created
    });

    it("should rollback credits when no tokens are used", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Hello" }];
      
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        yield {
          type: "RUN_FINISHED",
          usage: undefined, // No usage data
          finishReason: "error",
        };
      };
      
      const { chat } = await import("@tanstack/ai");
      vi.mocked(chat).mockReturnValue(mockStream());

      // Act
      const response = await agentService.streamChatResponse(testUserId, messages);
      await consumeStream(response);

      // Assert - Credits rolled back
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(1000);

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
    });

    it("should throw error when user has insufficient credits", async () => {
      // Arrange - Create user with 0 credits
      await cleanDatabase();
      await seedTestUser(testUserId, 0);
      
      const messages = [{ role: "user" as const, content: "Hello" }];

      // Act & Assert
      await expect(
        agentService.streamChatResponse(testUserId, messages)
      ).rejects.toThrow("Insufficient credits");

      // No logs should be created
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
    });

    it("should handle concurrent chat requests correctly", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Hello" }];
      
      const mockStream = async function* () {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        yield {
          type: "RUN_FINISHED",
          usage: { promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
          finishReason: "stop",
        };
      };
      
      const { chat } = await import("@tanstack/ai");
      vi.mocked(chat).mockImplementation(() => mockStream());

      // Act - Make 3 concurrent requests
      const responses = await Promise.all([
        agentService.streamChatResponse(testUserId, messages),
        agentService.streamChatResponse(testUserId, messages),
        agentService.streamChatResponse(testUserId, messages),
      ]);

      // Consume all streams
      await Promise.all(responses.map(r => consumeStream(r)));

   Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(997); // 1000 - 3 credits

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(3);
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
