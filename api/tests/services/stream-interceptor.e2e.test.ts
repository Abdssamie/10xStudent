import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { AgentService } from "@/services/agent";
import { CreditManager } from "@/services/credit-manager";
import { TestDatabaseService } from "../helpers/test-database-service";

/**
 * End-to-End Stream Interceptor Tests
 * 
 * These tests use REAL Gemini API to verify:
 * 1. Stream interception works - tokens are tracked, credits deducted
 * 2. Concurrent requests work - multiple simultaneous requests don't interfere
 * 3. Error handling works - insufficient credits caught before API calls
 * 
 * Requirements:
 * - GOOGLE_API_KEY must be set in environment
 * - Real API calls will be made (costs apply - minimal usage)
 */

describe("Stream Interceptor E2E Tests (Real Gemini API)", () => {
  let testDb: TestDatabaseService;
  let agentService: AgentService;
  let creditManager: CreditManager;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID format

  beforeEach(async () => {
    // Create fresh database service for this test file
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    
    // Clean database before each test
    await testDb.cleanDatabase();
    
    // Seed test user with credits
    await testDb.seedTestUser(testUserId, 10000);
    
    // Create instances with this test file's db instance
    creditManager = new CreditManager(testDb.getDb());
    agentService = new AgentService(testDb.getDb(), creditManager);
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.close();
    }
  });

  describe("Real API Stream Interception", () => {
    it("should intercept real Gemini API stream and track tokens", async () => {
      // Arrange - minimal prompt
      const messages = [
        { role: "user" as const, content: "Say 'Hi'." }
      ];

      const initialCredits = await testDb.getUserCredits(testUserId);
      expect(initialCredits).toBe(10000);

      // Act - Make real API call
      const response = await agentService.streamChatResponse(testUserId, messages);
      
      // Consume the stream
      await consumeStream(response);

      // Wait for async credit finalization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Assert - Credits were deducted
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBeLessThan(initialCredits);
      expect(finalCredits).toBeGreaterThanOrEqual(0);

      // Assert - Credit log was created
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log?.operation).toBe("chat_completion");
      expect(log?.cost).toBeGreaterThan(0);
      expect(log?.tokensUsed).toBeGreaterThan(0);
    }, 15000);

    it("should handle concurrent requests correctly", async () => {
      // Arrange - minimal prompts
      const messages1 = [{ role: "user" as const, content: "Say 'A'." }];
      const messages2 = [{ role: "user" as const, content: "Say 'B'." }];

      const initialCredits = await testDb.getUserCredits(testUserId);

      // Act - Make 2 concurrent requests
      const [response1, response2] = await Promise.all([
        agentService.streamChatResponse(testUserId, messages1),
        agentService.streamChatResponse(testUserId, messages2),
      ]);

      // Consume both streams
      await Promise.all([
        consumeStream(response1),
        consumeStream(response2),
      ]);

      // Wait for all async credit finalizations
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Assert - Both requests were logged
      const finalCredits = await testDb.getUserCredits(testUserId);
      const totalCreditsUsed = initialCredits - finalCredits;
      
      expect(totalCreditsUsed).toBeGreaterThan(0);

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(2); // 2 separate operations

      const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
      expect(totalTokens).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle insufficient credits before making API call", async () => {
      // Arrange - Set user to 0 credits
      await testDb.cleanDatabase();
      await testDb.seedTestUser(testUserId, 0);

      const messages = [{ role: "user" as const, content: "Hello" }];

      // Act & Assert - Should fail before making API call
      await expect(
        agentService.streamChatResponse(testUserId, messages)
      ).rejects.toThrow("Insufficient credits");

      // No API call should have been made
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
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
