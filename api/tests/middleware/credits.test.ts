// Set DATABASE_URL before any imports
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  canUseAi,
  checkAiCreditsMiddleware,
} from "../../src/middleware/credits.js";
import { Hono } from "hono";

// Mock the database package
vi.mock("@/database", () => {
  const mockSelect = vi.fn();
  return {
    db: {
      select: mockSelect,
    },
    schema: {
      users: {},
    },
    eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  };
});

describe("credits", () => {
  describe("canUseAi", () => {
    it("blocks when credits are zero", () => {
      expect(canUseAi(0)).toBe(false);
    });

    it("allows when credits are positive", () => {
      expect(canUseAi(1)).toBe(true);
      expect(canUseAi(100)).toBe(true);
      expect(canUseAi(10000)).toBe(true);
    });

    it("blocks when credits are negative", () => {
      expect(canUseAi(-1)).toBe(false);
      expect(canUseAi(-100)).toBe(false);
    });
  });

  describe("checkAiCreditsMiddleware", () => {
    let app: Hono;
    let mockDb: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.clearAllMocks();

      // Get the mocked db
      const { db } = await import("@/database");
      mockDb = db.select as ReturnType<typeof vi.fn>;

      // Create test app
      app = new Hono();
      app.use("/*", checkAiCreditsMiddleware);
      app.post("/test", (c) => c.json({ success: true }));
    });

    it("returns 401 when no auth context", async () => {
      const res = await app.request("/test", { method: "POST" });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 402 when user has zero credits", async () => {
      // Mock database response
      mockDb.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ credits: 0 }]),
        }),
      });

      // Create app with auth context
      const appWithAuth = new Hono();
      appWithAuth.use("/*", async (c, next) => {
        c.set("auth", { userId: "test-user-id", sessionId: "test-session" });
        await next();
      });
      appWithAuth.use("/*", checkAiCreditsMiddleware);
      appWithAuth.post("/test", (c) => c.json({ success: true }));

      const res = await appWithAuth.request("/test", { method: "POST" });
      expect(res.status).toBe(402);
      const body = (await res.json()) as { error: string; credits: number };
      expect(body.error).toBe("Insufficient credits");
      expect(body.credits).toBe(0);
    });

    it("allows request when user has positive credits", async () => {
      // Mock database response
      mockDb.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ credits: 100 }]),
        }),
      });

      // Create app with auth context
      const appWithAuth = new Hono();
      appWithAuth.use("/*", async (c, next) => {
        c.set("auth", { userId: "test-user-id", sessionId: "test-session" });
        await next();
      });
      appWithAuth.use("/*", checkAiCreditsMiddleware);
      appWithAuth.post("/test", (c) => c.json({ success: true }));

      const res = await appWithAuth.request("/test", { method: "POST" });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("returns 404 when user not found", async () => {
      // Mock database response - empty array means user not found
      mockDb.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // Create app with auth context
      const appWithAuth = new Hono();
      appWithAuth.use("/*", async (c, next) => {
        c.set("auth", {
          userId: "nonexistent-user",
          sessionId: "test-session",
        });
        await next();
      });
      appWithAuth.use("/*", checkAiCreditsMiddleware);
      appWithAuth.post("/test", (c) => c.json({ success: true }));

      const res = await appWithAuth.request("/test", { method: "POST" });
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("User not found");
    });
  });
});
