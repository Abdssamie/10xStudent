import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { AgentService } from "@/services/agent";
import { CreditManager } from "@/services/credit-manager";
import { TestDatabaseService } from "../helpers/test-database-service";

/**
 * End-to-End Stream Interceptor Tests
 * 
 * These tests use REAL Gemini API and TanStack AI to verify the async generator
 * stream interception pattern works correctly in production scenarios.
 * 
 * Requirements:
 * - GOOGLE_API_KEY must be set in environment
 * - Real API calls will be made (costs apply)
 * - Tests verify token tracking, credit management, and stream consumption
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
    await testDb.seedTestUser(testUserId, 10000); // Give plenty of credits for API calls
    
    // Create real instances with this test file's db instance (no mocks!)
    creditManager = new CreditManager(testDb.getDb());
    agentService = new AgentService(testDb.getDb(), creditManager);
  });

  afterAll(async () => {
    // Close this test file's database connection
    if (testDb) {
      await testDb.close();
    }
  });

  describe("Real API Stream Interception", () => {
    it("should intercept real Gemini API stream and track tokens", async () => {
      // Arrange
      const messages = [
        { role: "user" as const, content: "Say 'Hello World' and nothing else." }
      ];

      const initialCredits = await testDb.getUserCredits(testUserId);
      expect(initialCredits).toBe(10000);

      // Act - Make real API call
      const response = await agentService.streamChatResponse(testUserId, messages);
      
      // Consume the stream
      const chunks: string[] = [];
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No body reader available");
      }

      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          chunks.push(chunk);
        }
      } finally {
        reader.releaseLock();
      }

      // Assert - Verify stream was consumed
      expect(chunks.length).toBeGreaterThan(0);

      // Wait for async credit finalization to complete
      await new Promise(resolve => setTimeout(resolve, 500));

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

      console.log(`✅ Real API test completed:`);
      console.log(`   - Tokens used: ${log?.tokensUsed}`);
      console.log(`   - Credits charged: ${log?.cost}`);
      console.log(`   - Stream chunks received: ${chunks.length}`);
    }, 30000); // 30 second timeout for real API call

    it("should handle longer responses and track accurate token counts", async () => {
      // Arrange
      const messages = [
        { 
          role: "user" as const, 
          content: "List 5 programming languages with one sentence each." 
        }
      ];

      const initialCredits = await testDb.getUserCredits(testUserId);

      // Act - Make real API call with longer response
      const response = await agentService.streamChatResponse(testUserId, messages);
      await consumeStream(response);

      // Wait for async credit finalization
      await new Promise(resolve => setTimeout(resolve, 500));

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      const creditsUsed = initialCredits - finalCredits;
      
      expect(creditsUsed).toBeGreaterThan(0);
      expect(creditsUsed).toBeLessThan(100); // Sanity check

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log?.tokensUsed).toBeGreaterThan(10); // Longer response = more tokens
      
      console.log(`✅ Longer response test completed:`);
      console.log(`   - Tokens used: ${log?.tokensUsed}`);
      console.log(`   - Credits charged: ${log?.cost}`);
    }, 30000);

    it("should handle concurrent real API requests correctly", async () => {
      // Arrange
      const messages1 = [{ role: "user" as const, content: "Say 'Test 1'" }];
      const messages2 = [{ role: "user" as const, content: "Say 'Test 2'" }];
      const messages3 = [{ role: "user" as const, content: "Say 'Test 3'" }];

      const initialCredits = await testDb.getUserCredits(testUserId);

      // Act - Make 3 concurrent real API calls
      const [response1, response2, response3] = await Promise.all([
        agentService.streamChatResponse(testUserId, messages1),
        agentService.streamChatResponse(testUserId, messages2),
        agentService.streamChatResponse(testUserId, messages3),
      ]);

      // Consume all streams
      await Promise.all([
        consumeStream(response1),
        consumeStream(response2),
        consumeStream(response3),
      ]);

      // Wait for all async credit finalizations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      const totalCreditsUsed = initialCredits - finalCredits;
      
      expect(totalCreditsUsed).toBeGreaterThan(0);
      expect(totalCreditsUsed).toBeLessThan(100);

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(3); // 3 separate operations

      const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
      expect(totalTokens).toBeGreaterThan(0);

      console.log(`✅ Concurrent requests test completed:`);
      console.log(`   - Total requests: 3`);
      console.log(`   - Total tokens: ${totalTokens}`);
      console.log(`   - Total credits: ${totalCreditsUsed}`);
    }, 60000); // 60 second timeout for concurrent calls

    it("should properly refund credits when response is minimal", async () => {
      // Arrange
      const messages = [
        { role: "user" as const, content: "Say only: Hi" }
      ];

      const initialCredits = await testDb.getUserCredits(testUserId);

      // Act
      const response = await agentService.streamChatResponse(testUserId, messages);
      await consumeStream(response);

      // Wait for finalization
      await new Promise(resolve => setTimeout(resolve, 500));

      // Assert - Should charge minimum 1 credit even for tiny response
      const finalCredits = await testDb.getUserCredits(testUserId);
      const creditsUsed = initialCredits - finalCredits;
      
      expect(creditsUsed).toBeGreaterThanOrEqual(1); // Minimum 1 credit
      expect(creditsUsed).toBeLessThan(5); // But not too much

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs[0]?.cost).toBeGreaterThanOrEqual(1);

      console.log(`✅ Minimal response test completed:`);
      console.log(`   - Tokens used: ${logs[0]?.tokensUsed}`);
      console.log(`   - Credits charged: ${logs[0]?.cost} (minimum 1)`);
    }, 30000);
  });

  describe("Error Handling with Real API", () => {
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
