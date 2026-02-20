import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CreditRefreshService } from "@/services/credit-refresh";
import { TestDatabaseService } from "../helpers/test-database-service";
import { sql } from "drizzle-orm";
import * as schema from "@/infrastructure/db/schema";

describe("CreditRefreshService", () => {
  let testDb: TestDatabaseService;
  let service: CreditRefreshService;

  beforeEach(async () => {
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    await testDb.cleanDatabase();
    service = new CreditRefreshService(testDb.getDb());
  });

  afterEach(async () => {
    await testDb.close();
  });

  describe("findUsersToRefresh", () => {
    it("should return users whose creditsResetAt is older than 1 month", async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 2);

      const user = await testDb.seedTestUser("clerk-old-user", 500);
      
      await testDb.getDb()
        .update(schema.users)
        .set({ creditsResetAt: oldDate })
        .where(sql`${schema.users.id} = ${user.id}`);

      const result = await service.findUsersToRefresh(10);

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe(user.id);
      expect(result[0]?.credits).toBe(500);
    });

    it("should not return users with recent creditsResetAt", async () => {
      await testDb.seedTestUser("clerk-recent-user", 500);

      const result = await service.findUsersToRefresh(10);

      expect(result.length).toBe(0);
    });
  });

  describe("refreshUserCredits", () => {
    it("should refresh credits for an existing user", async () => {
      const user = await testDb.seedTestUser("clerk-refresh-user", 500);

      const result = await service.refreshUserCredits(user.id);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(user.id);
      expect(result?.previousCredits).toBe(500);
      expect(result?.newCredits).toBe(10000);
      expect(result?.refreshedAt).toBeInstanceOf(Date);

      const updatedUser = await testDb.getUserById(user.id);
      expect(updatedUser?.credits).toBe(10000);

      const logs = await testDb.getUserCreditLogs(user.id);
      expect(logs.length).toBe(1);
      expect(logs[0]?.operation).toBe("monthly_refresh");
    });

    it("should return null if user is not found", async () => {
      const result = await service.refreshUserCredits("00000000-0000-0000-0000-000000000000");

      expect(result).toBeNull();
    });
  });

  describe("refreshAllCredits", () => {
    it("should process all users needing refresh", async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 2);

      const user1 = await testDb.seedTestUser("clerk-user-1", 500);
      const user2 = await testDb.seedTestUser("clerk-user-2", 300);

      const db = testDb.getDb();
      await db.update(schema.users)
        .set({ creditsResetAt: oldDate })
        .where(sql`${schema.users.id} = ${user1.id}`);
      await db.update(schema.users)
        .set({ creditsResetAt: oldDate })
        .where(sql`${schema.users.id} = ${user2.id}`);

      const result = await service.refreshAllCredits(100);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it("should handle no users needing refresh", async () => {
      await testDb.seedTestUser("clerk-recent-user", 500);

      const result = await service.refreshAllCredits(100);

      expect(result.processed).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe("getRefreshStats", () => {
    it("should return correct statistics", async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 2);

      const user1 = await testDb.seedTestUser("clerk-stats-1", 500);
      const user2 = await testDb.seedTestUser("clerk-stats-2", 300);

      const db = testDb.getDb();
      await db.update(schema.users)
        .set({ creditsResetAt: oldDate })
        .where(sql`${schema.users.id} = ${user1.id}`);

      await service.refreshUserCredits(user1.id);

      const stats = await service.getRefreshStats();

      expect(stats.totalUsers).toBe(2);
      expect(stats.usersNeedingRefresh).toBeGreaterThanOrEqual(0);
      expect(stats.lastRefreshDate).not.toBeNull();
    });

    it("should return null lastRefreshDate when no refreshes", async () => {
      await testDb.seedTestUser("clerk-no-refresh", 500);

      const stats = await service.getRefreshStats();

      expect(stats.totalUsers).toBe(1);
      expect(stats.lastRefreshDate).toBeNull();
    });
  });
});
