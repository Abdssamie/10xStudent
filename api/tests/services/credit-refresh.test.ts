import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreditRefreshService } from "../../src/services/credit-refresh";

// Mock the database module
vi.mock("@/infrastructure/db", () => ({
  db: {
    transaction: vi.fn(),
  },
  schema: {
    users: { id: "users_table" },
    creditLogs: { id: "credit_logs_table" },
  },
  eq: vi.fn(),
  sql: vi.fn(),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  lte: vi.fn(),
  relations: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

describe("CreditRefreshService", () => {
  let dbMock: any;
  let service: CreditRefreshService;
  let schema: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked schema
    const database = await import("@/infrastructure/db");
    schema = database.schema;

    // Create a mock for Drizzle's fluent API
    const createMockQuery = () => {
      const query: any = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        for: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        then: vi.fn(),
      };
      return query;
    };

    dbMock = createMockQuery();
    dbMock.transaction = vi.fn();

    service = new CreditRefreshService(dbMock);
  });

  describe("findUsersToRefresh", () => {
    it("should return users whose creditsResetAt is older than 1 month", async () => {
      const mockUsers = [
        { id: "user-1", credits: 500, creditsResetAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
      ];

      dbMock.then.mockImplementation((resolve: any) => resolve(mockUsers));

      const result = await service.findUsersToRefresh(10);

      expect(dbMock.select).toHaveBeenCalled();
      expect(dbMock.from).toHaveBeenCalledWith(schema.users);
      expect(dbMock.where).toHaveBeenCalled();
      expect(dbMock.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockUsers);
    });
  });

  describe("refreshUserCredits", () => {
    it("should refresh credits for an existing user", async () => {
      const userId = "user-1";
      const mockUser = { id: userId, credits: 500 };

      dbMock.transaction.mockImplementation(async (callback: any) => {
        return callback(dbMock);
      });

      dbMock.then.mockImplementationOnce((resolve: any) => resolve([mockUser]));
      dbMock.then.mockImplementationOnce((resolve: any) => resolve({}));
      dbMock.then.mockImplementationOnce((resolve: any) => resolve({}));

      const result = await service.refreshUserCredits(userId);

      expect(dbMock.transaction).toHaveBeenCalled();
      expect(dbMock.update).toHaveBeenCalledWith(schema.users);
      expect(dbMock.insert).toHaveBeenCalledWith(schema.creditLogs);
      expect(result).toMatchObject({
        userId,
        previousCredits: 500,
        newCredits: 10000,
      });
      expect(result?.refreshedAt).toBeInstanceOf(Date);
    });

    it("should return null if user is not found", async () => {
      const userId = "non-existent";

      dbMock.transaction.mockImplementation(async (callback: any) => {
        return callback(dbMock);
      });

      dbMock.then.mockImplementationOnce((resolve: any) => resolve([]));

      const result = await service.refreshUserCredits(userId);

      expect(result).toBeNull();
    });
  });

  describe("refreshAllCredits", () => {
    it("should process all users needing refresh", async () => {
      const mockUsers = [{ id: "user-1" }, { id: "user-2" }];

      const findUsersSpy = vi.spyOn(service, "findUsersToRefresh").mockResolvedValue(mockUsers as any);
      const refreshUserSpy = vi.spyOn(service, "refreshUserCredits").mockImplementation(async (id) => ({
        userId: id,
        previousCredits: 0,
        newCredits: 10000,
        refreshedAt: new Date(),
      }));

      const result = await service.refreshAllCredits(100);

      expect(findUsersSpy).toHaveBeenCalledWith(100);
      expect(refreshUserSpy).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it("should handle failures for individual users", async () => {
      const mockUsers = [{ id: "user-1" }, { id: "user-2" }];

      vi.spyOn(service, "findUsersToRefresh").mockResolvedValue(mockUsers as any);
      vi.spyOn(service, "refreshUserCredits")
        .mockResolvedValueOnce({ userId: "user-1", previousCredits: 0, newCredits: 10000, refreshedAt: new Date() })
        .mockRejectedValueOnce(new Error("Database error"));

      const result = await service.refreshAllCredits(100);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe("getRefreshStats", () => {
    it("should return correct statistics", async () => {
      const lastRefreshDate = new Date();

      dbMock.then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 100 }]))
        .mockImplementationOnce((resolve: any) => resolve([{ count: 10 }]))
        .mockImplementationOnce((resolve: any) => resolve([{ timestamp: lastRefreshDate }]));

      const stats = await service.getRefreshStats();

      expect(stats).toEqual({
        totalUsers: 100,
        usersNeedingRefresh: 10,
        lastRefreshDate: lastRefreshDate,
      });

      expect(dbMock.select).toHaveBeenCalledTimes(3);
    });

    it("should handle empty results gracefully", async () => {
      dbMock.then
        .mockImplementationOnce((resolve: any) => resolve([]))
        .mockImplementationOnce((resolve: any) => resolve([]))
        .mockImplementationOnce((resolve: any) => resolve([]));

      const stats = await service.getRefreshStats();

      expect(stats).toEqual({
        totalUsers: 0,
        usersNeedingRefresh: 0,
        lastRefreshDate: null,
      });
    });
  });
});
