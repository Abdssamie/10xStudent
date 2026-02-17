import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { CreditManager } from "@/services/credit-manager";
import { TestDatabaseService } from "../helpers/test-database-service";

describe("CreditManager Integration Tests", () => {
  let testDb: TestDatabaseService;
  let creditManager: CreditManager;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    // Create fresh database service for this test file
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    
    // Clean database before each test for isolation
    await testDb.cleanDatabase();
    
    // Create fresh CreditManager instance with this test file's database
    creditManager = new CreditManager(testDb.getDb());
    
    // Seed test user with initial credits
    await testDb.seedTestUser(testUserId, 1000);
  });

  afterAll(async () => {
    // Close this test file's database connection
    if (testDb) {
      await testDb.close();
    }
  });

  describe("reserveCredits", () => {
    it("should reserve credits and deduct from user balance", async () => {
      // Arrange
      const initialCredits = await testDb.getUserCredits(testUserId);
      expect(initialCredits).toBe(1000);

      // Act
      const reservation = await creditManager.reserveCredits(testUserId, 100);

      // Assert
      expect(reservation.reservedAmount).toBe(100);
      expect(reservation.remainingCredits).toBe(900);
      expect(reservation.userId).toBe(testUserId);

      const updatedCredits = await testDb.getUserCredits(testUserId);
      expect(updatedCredits).toBe(900);
    });

    it("should throw error when user has insufficient credits", async () => {
      // Arrange - User has 1000 credits
      
      // Act & Assert
      await expect(
        creditManager.reserveCredits(testUserId, 1500)
      ).rejects.toThrow("Insufficient credits");

      // Credits should remain unchanged
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(1000);
    });

    it("should throw error when user does not exist", async () => {
      // Act & Assert
      await expect(
        creditManager.reserveCredits("non-existent-user", 100)
      ).rejects.toThrow(); // Will throw error from database query
    });

    it("should handle concurrent reservations correctly", async () => {
      // Act - Try to reserve credits concurrently
      const promises = [
        creditManager.reserveCredits(testUserId, 300),
        creditManager.reserveCredits(testUserId, 300),
        creditManager.reserveCredits(testUserId, 300),
      ];

      // Assert - Only 3 should succeed (900 total), 4th would fail
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === "fulfilled");
      
      expect(successful.length).toBe(3);
      
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(100); // 1000 - 900 = 100
    });
  });

  describe("finalizeCredits", () => {
    it("should finalize credits and log the transaction", async () => {
      // Arrange - Reserve credits first
      await creditManager.reserveCredits(testUserId, 100);

      // Act - Finalize with actual cost less than reserved
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        100, // reserved
        50,  // actual cost
        500  // tokens used
      );

      // Assert - Check credit log was created
      const logs = await testDb.getUserCreditLogs(testUserId);
      
      expect(logs).toHaveLength(1);
      const log = logs[0];
      expect(log?.operation).toBe("chat_completion");
      expect(log?.cost).toBe(50);
      expect(log?.tokensUsed).toBe(500);

      // Check user got refunded (100 reserved - 50 actual = 50 refund)
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(950); // 900 (after reservation) + 50 (refund) = 950
    });

    it("should deduct additional credits if actual cost exceeds reservation", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 50);

      // Act - Actual cost is higher than reserved
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        50,  // reserved
        100, // actual cost (higher!)
        1000 // tokens used
      );

      // Assert
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(900); // 950 (after reservation) - 50 (additional) = 900

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(100);
    });

    it("should handle exact match between reserved and actual cost", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 100);

      // Act - Exact match
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        100, // reserved
        100, // actual cost (same)
        1000
      );

      // Assert - No refund, no additional deduction
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(900); // 1000 - 100 = 900

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(100);
    });
  });

  describe("rollbackCredits", () => {
    it("should rollback credits on error", async () => {
      // Arrange - Reserve credits
      await creditManager.reserveCredits(testUserId, 100);
      const creditsAfterReservation = await testDb.getUserCredits(testUserId);
      expect(creditsAfterReservation).toBe(900);

      // Act - Rollback
      await creditManager.rollbackCredits(testUserId, 100);

      // Assert - Credits restored
      const creditsAfterRollback = await testDb.getUserCredits(testUserId);
      expect(creditsAfterRollback).toBe(1000);

      // No credit log should be created for rollback
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
    });

    it("should handle multiple rollbacks", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 100);
      await creditManager.reserveCredits(testUserId, 200);
      
      const creditsAfterReservations = await testDb.getUserCredits(testUserId);
      expect(creditsAfterReservations).toBe(700); // 1000 - 100 - 200

      // Act - Rollback both
      await creditManager.rollbackCredits(testUserId, 100);
      await creditManager.rollbackCredits(testUserId, 200);

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(1000);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle complete chat completion flow", async () => {
      // Arrange - User starts with 1000 credits
      
      // Act - Simulate chat completion
      // 1. Reserve credits
      const reservation = await creditManager.reserveCredits(testUserId, 1);
      expect(reservation.remainingCredits).toBe(999);

      // 2. Finalize with actual usage
      await creditManager.finalizeCredits(
        testUserId,
        "etion",
        1,    // reserved
        3,    // actual (3000 tokens = 3 credits)
        3000  // tokens
      );

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(997); // 1000 - 3 = 997

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(3);
      expect(logs[0]?.tokensUsed).toBe(3000);
    });

    it("should handle failed chat completion with rollback", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 1);
      expect(await testDb.getUserCredits(testUserId)).toBe(999);

      // Act - Simulate failure and rollback
      await creditManager.rollbackCredits(testUserId, 1);

      // Assert - Credits fully restored
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(1000);

      // No logs created
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
    });
  });

  describe("finalizeCredits", () => {
    it("should finalize credits and log the transaction", async () => {
      // Arrange - Reserve credits first
      await creditManager.reserveCredits(testUserId, 100);

      // Act - Finalize with actual cost less than reserved
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        100, // reserved
        50,  // actual cost
        500  // tokens used
      );

      // Assert - Check credit log was created
      const logs = await testDb.getUserCreditLogs(testUserId);
      
      expect(logs).toHaveLength(1);
      const log = logs[0];
      expect(log?.operation).toBe("chat_completion");
      expect(log?.cost).toBe(50);
      expect(log?.tokensUsed).toBe(500);

      // Check user got refunded (100 reserved - 50 actual = 50 refund)
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(950); // 900 (after reservation) + 50 (refund) = 950
    });

    it("should deduct additional credits if actual cost exceeds reservation", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 50);

      // Act - Actual cost is higher than reserved
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        50,  // reserved
        100, // actual cost (higher!)
        1000 // tokens used
      );

      // Assert
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(900); // 950 (after reservation) - 50 (additional) = 900

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(100);
    });

    it("should handle exact match between reserved and actual cost", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 100);

      // Act - Exact match
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        100, // reserved
        100, // actual cost (same)
        1000
      );

      // Assert - No refund, no additional deduction
      const credits = await testDb.getUserCredits(testUserId);
      expect(credits).toBe(900); // 1000 - 100 = 900

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(100);
    });
  });

  describe("rollbackCredits", () => {
    it("should rollback credits on error", async () => {
      // Arrange - Reserve credits
      await creditManager.reserveCredits(testUserId, 100);
      const creditsAfterReservation = await testDb.getUserCredits(testUserId);
      expect(creditsAfterReservation).toBe(900);

      // Act - Rollback
      await creditManager.rollbackCredits(testUserId, 100);

      // Assert - Credits restored
      const creditsAfterRollback = await testDb.getUserCredits(testUserId);
      expect(creditsAfterRollback).toBe(1000);

      // No credit log should be created for rollback
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
    });

    it("should handle multiple rollbacks", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 100);
      await creditManager.reserveCredits(testUserId, 200);
      
      const creditsAfterReservations = await testDb.getUserCredits(testUserId);
      expect(creditsAfterReservations).toBe(700); // 1000 - 100 - 200

      // Act - Rollback both
      await creditManager.rollbackCredits(testUserId, 100);
      await creditManager.rollbackCredits(testUserId, 200);

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(1000);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle complete chat completion flow", async () => {
      // Arrange - User starts with 1000 credits
      
      // Act - Simulate chat completion
      // 1. Reserve credits
      const reservation = await creditManager.reserveCredits(testUserId, 1);
      expect(reservation.remainingCredits).toBe(999);

      // 2. Finalize with actual usage
      await creditManager.finalizeCredits(
        testUserId,
        "chat_completion",
        1,    // reserved
        3,    // actual (3000 tokens = 3 credits)
        3000  // tokens
      );

      // Assert
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(997); // 1000 - 3 = 997

      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(3);
      expect(logs[0]?.tokensUsed).toBe(3000);
    });

    it("should handle failed chat completion with rollback", async () => {
      // Arrange
      await creditManager.reserveCredits(testUserId, 1);
      expect(await testDb.getUserCredits(testUserId)).toBe(999);

      // Act - Simulate failure and rollback
      await creditManager.rollbackCredits(testUserId, 1);

      // Assert - Credits fully restored
      const finalCredits = await testDb.getUserCredits(testUserId);
      expect(finalCredits).toBe(1000);

      // No logs created
      const logs = await testDb.getUserCreditLogs(testUserId);
      expect(logs).toHaveLength(0);
    });
  });
});
