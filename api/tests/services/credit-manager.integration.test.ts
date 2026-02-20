import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { CreditManager } from "@/services/credit-manager";
import { TestDatabaseService } from "../helpers/test-database-service";
import type { User } from "@/infrastructure/db/schema";

describe("CreditManager Integration Tests", () => {
  let testDb: TestDatabaseService;
  let creditManager: CreditManager;
  let testUser: User;
  const testClerkId = "660e8400-e29b-41d4-a716-446655440002";

  beforeEach(async () => {
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    
    await testDb.cleanDatabase();
    
    creditManager = new CreditManager(testDb.getDb());
    
    testUser = await testDb.seedTestUser(testClerkId, 1000);
  });

  afterEach(async () => {
    // Close this test's database connection
    if (testDb) {
      await testDb.close();
    }
  });

  afterAll(async () => {
    // Cleanup handled in afterEach
  });

  describe("reserveCredits", () => {
    it("should reserve credits and deduct from user balance", async () => {
      const initialCredits = await testDb.getUserCredits(testUser.id);
      expect(initialCredits).toBe(1000);

      const reservation = await creditManager.reserveCredits(testUser.id, 100);

      expect(reservation.reservedAmount).toBe(100);
      expect(reservation.remainingCredits).toBe(900);
      expect(reservation.userId).toBe(testUser.id);

      const updatedCredits = await testDb.getUserCredits(testUser.id);
      expect(updatedCredits).toBe(900);
    });

    it("should throw error when user has insufficient credits", async () => {
      await expect(
        creditManager.reserveCredits(testUser.id, 1500)
      ).rejects.toThrow("Insufficient credits");

      const credits = await testDb.getUserCredits(testUser.id);
      expect(credits).toBe(1000);
    });

    it("should throw error when user does not exist", async () => {
      await expect(
        creditManager.reserveCredits("non-existent-user", 100)
      ).rejects.toThrow();
    });

    it("should handle concurrent reservations correctly", async () => {
      const promises = [
        creditManager.reserveCredits(testUser.id, 300),
        creditManager.reserveCredits(testUser.id, 300),
        creditManager.reserveCredits(testUser.id, 300),
      ];

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === "fulfilled");
      
      expect(successful.length).toBe(3);
      
      const finalCredits = await testDb.getUserCredits(testUser.id);
      expect(finalCredits).toBe(100);
    });
  });

  describe("finalizeCredits", () => {
    it("should finalize credits and log the transaction", async () => {
      await creditManager.reserveCredits(testUser.id, 100);

      await creditManager.finalizeCredits(
        testUser.id,
        "chat_completion",
        100,
        50,
        500
      );

      const logs = await testDb.getUserCreditLogs(testUser.id);
      
      expect(logs).toHaveLength(1);
      const log = logs[0];
      expect(log?.operation).toBe("chat_completion");
      expect(log?.cost).toBe(50);
      expect(log?.tokensUsed).toBe(500);

      const credits = await testDb.getUserCredits(testUser.id);
      expect(credits).toBe(950);
    });

    it("should deduct additional credits if actual cost exceeds reservation", async () => {
      await creditManager.reserveCredits(testUser.id, 50);

      await creditManager.finalizeCredits(
        testUser.id,
        "chat_completion",
        50,
        100,
        1000
      );

      const credits = await testDb.getUserCredits(testUser.id);
      expect(credits).toBe(900);

      const logs = await testDb.getUserCreditLogs(testUser.id);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(100);
    });

    it("should handle exact match between reserved and actual cost", async () => {
      await creditManager.reserveCredits(testUser.id, 100);

      await creditManager.finalizeCredits(
        testUser.id,
        "chat_completion",
        100,
        100,
        1000
      );

      const credits = await testDb.getUserCredits(testUser.id);
      expect(credits).toBe(900);

      const logs = await testDb.getUserCreditLogs(testUser.id);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(100);
    });
  });

  describe("rollbackCredits", () => {
    it("should rollback credits on error", async () => {
      await creditManager.reserveCredits(testUser.id, 100);
      const creditsAfterReservation = await testDb.getUserCredits(testUser.id);
      expect(creditsAfterReservation).toBe(900);

      await creditManager.rollbackCredits(testUser.id, 100);

      const creditsAfterRollback = await testDb.getUserCredits(testUser.id);
      expect(creditsAfterRollback).toBe(1000);

      const logs = await testDb.getUserCreditLogs(testUser.id);
      expect(logs).toHaveLength(0);
    });

    it("should handle multiple rollbacks", async () => {
      await creditManager.reserveCredits(testUser.id, 100);
      await creditManager.reserveCredits(testUser.id, 200);
      
      const creditsAfterReservations = await testDb.getUserCredits(testUser.id);
      expect(creditsAfterReservations).toBe(700);

      await creditManager.rollbackCredits(testUser.id, 100);
      await creditManager.rollbackCredits(testUser.id, 200);

      const finalCredits = await testDb.getUserCredits(testUser.id);
      expect(finalCredits).toBe(1000);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle complete chat completion flow", async () => {
      const reservation = await creditManager.reserveCredits(testUser.id, 1);
      expect(reservation.remainingCredits).toBe(999);

      await creditManager.finalizeCredits(
        testUser.id,
        "chat_completion",
        1,
        3,
        3000
      );

      const finalCredits = await testDb.getUserCredits(testUser.id);
      expect(finalCredits).toBe(997);

      const logs = await testDb.getUserCreditLogs(testUser.id);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.cost).toBe(3);
      expect(logs[0]?.tokensUsed).toBe(3000);
    });

    it("should handle failed chat completion with rollback", async () => {
      await creditManager.reserveCredits(testUser.id, 1);
      expect(await testDb.getUserCredits(testUser.id)).toBe(999);

      await creditManager.rollbackCredits(testUser.id, 1);

      const finalCredits = await testDb.getUserCredits(testUser.id);
      expect(finalCredits).toBe(1000);

      const logs = await testDb.getUserCreditLogs(testUser.id);
      expect(logs).toHaveLength(0);
    });
  });
});
