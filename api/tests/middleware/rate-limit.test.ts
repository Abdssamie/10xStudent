/**
 * Rate limiting middleware tests
 * Tests Redis-backed sliding window rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import type Redis from "ioredis";
import { createRateLimitMiddleware } from "../../src/middleware/rate-limit";
import { TooManyRequestsError } from "../../src/lib/errors";

// Mock Redis client
const createMockRedis = () => {
  const store = new Map<string, Array<{ score: number; member: string }>>();

  return {
    pipeline: vi.fn(() => {
      const commands: Array<() => Promise<any>> = [];

      return {
        zremrangebyscore: vi.fn((key: string, min: number, max: number) => {
          commands.push(async () => {
            const entries = store.get(key) || [];
            const filtered = entries.filter((e) => e.score > max);
            store.set(key, filtered);
            return [null, filtered.length];
          });
          return this;
        }),
        zcard: vi.fn((key: string) => {
          commands.push(async () => {
            const entries = store.get(key) || [];
            return [null, entries.length];
          });
          return this;
        }),
        zadd: vi.fn((key: string, score: number, member: string) => {
          commands.push(async () => {
            const entries = store.get(key) || [];
            entries.push({ score, member });
            store.set(key, entries);
            return [null, 1];
          });
          return this;
        }),
        expire: vi.fn(() => {
          commands.push(async () => [null, 1]);
          return this;
        }),
        exec: vi.fn(async () => {
          const results = [];
          for (const cmd of commands) {
            results.push(await cmd());
          }
          return results;
        }),
      };
    }),
    _store: store,
    _reset: () => store.clear(),
  } as unknown as Redis & { _store: Map<string, any>; _reset: () => void };
};

describe("Rate Limiting Middleware", () => {
  let app: Hono;
  let mockRedis: Redis & { _store: Map<string, any>; _reset: () => void };

  beforeEach(() => {
    app = new Hono();
    mockRedis = createMockRedis();
    
    // Add error handler to convert errors to HTTP responses
    app.onError((err, c) => {
      if (err instanceof TooManyRequestsError) {
        return c.json(
          { error: err.message, code: err.code, details: err.details },
          429 as any
        );
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });
  });

  afterEach(() => {
    mockRedis._reset();
  });

  it("should allow requests within rate limit", async () => {
    // Mock auth context FIRST (middleware order matters!)
    app.use("*", async (c, next) => {
      c.set("auth", { userId: "user123", sessionId: "session123" });
      await next();
    });

    const rateLimiter = createRateLimitMiddleware(mockRedis, {
      windowMs: 60000,
      maxRequests: 5,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    app.use("*", rateLimiter);
    app.get("/test", (c) => c.json({ success: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });

  it("should block requests exceeding rate limit", async () => {
    const rateLimiter = createRateLimitMiddleware(mockRedis, {
      windowMs: 60000,
      maxRequests: 2,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    app.use("*", async (c, next) => {
      c.set("auth", { userId: "user123", sessionId: "session123" });
      await next();
    });

    app.use("*", rateLimiter);
    app.get("/test", (c) => c.json({ success: true }));

    // First request - should succeed
    const res1 = await app.request("/test");
    expect(res1.status).toBe(200);

    // Second request - should succeed
    const res2 = await app.request("/test");
    expect(res2.status).toBe(200);

    // Third request - should be rate limited
    const res3 = await app.request("/test");
    expect(res3.status).toBe(429);
    expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res3.headers.get("Retry-After")).toBeTruthy();
  });

  it("should skip rate limiting for unauthenticated users when configured", async () => {
    const rateLimiter = createRateLimitMiddleware(mockRedis, {
      windowMs: 60000,
      maxRequests: 1,
      keyPrefix: "test",
      skipUnauthenticated: true,
    });

    app.use("*", rateLimiter);
    app.get("/test", (c) => c.json({ success: true }));

    // No auth context set - should skip rate limiting
    const res1 = await app.request("/test");
    expect(res1.status).toBe(200);

    const res2 = await app.request("/test");
    expect(res2.status).toBe(200);
  });

  it("should include correct rate limit headers", async () => {
    const rateLimiter = createRateLimitMiddleware(mockRedis, {
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    app.use("*", async (c, next) => {
      c.set("auth", { userId: "user123", sessionId: "session123" });
      await next();
    });

    app.use("*", rateLimiter);
    app.get("/test", (c) => c.json({ success: true }));

    const res = await app.request("/test");
    
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    
    // Verify reset time is in the future
    const resetTime = new Date(res.headers.get("X-RateLimit-Reset")!);
    expect(resetTime.getTime()).toBeGreaterThan(Date.now());
  });

  it("should use different keys for different users", async () => {
    const rateLimiter = createRateLimitMiddleware(mockRedis, {
      windowMs: 60000,
      maxRequests: 1,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    // User 1 - first request
    const app1 = new Hono();
    app1.onError((err, c) => {
      if (err instanceof TooManyRequestsError) {
        return c.json(
          { error: err.message, code: err.code, details: err.details },
          429 as any
        );
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });
    app1.use("*", async (c, next) => {
      c.set("auth", { userId: "user1", sessionId: "session1" });
      await next();
    });
    app1.use("*", rateLimiter);
    app1.get("/test", (c) => c.json({ success: true }));

    const res1 = await app1.request("/test");
    expect(res1.status).toBe(200);

    // User 1 - second request (should be rate limited)
    const res2 = await app1.request("/test");
    expect(res2.status).toBe(429);

    // User 2 - first request (should succeed, different user)
    const app2 = new Hono();
    app2.onError((err, c) => {
      if (err instanceof TooManyRequestsError) {
        return c.json(
          { error: err.message, code: err.code, details: err.details },
          429 as any
        );
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });
    app2.use("*", async (c, next) => {
      c.set("auth", { userId: "user2", sessionId: "session2" });
      await next();
    });
    app2.use("*", rateLimiter);
    app2.get("/test", (c) => c.json({ success: true }));

    const res3 = await app2.request("/test");
    expect(res3.status).toBe(200);
  });

  it("should fail open when Redis errors occur", async () => {
    // Create a Redis mock that throws errors
    const errorRedis = {
      pipeline: vi.fn(() => {
        throw new Error("Redis connection failed");
      }),
    } as unknown as Redis;

    const rateLimiter = createRateLimitMiddleware(errorRedis, {
      windowMs: 60000,
      maxRequests: 1,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    app.use("*", async (c, next) => {
      c.set("auth", { userId: "user123", sessionId: "session123" });
      await next();
    });

    app.use("*", rateLimiter);
    app.get("/test", (c) => c.json({ success: true }));

    // Should allow request even though Redis failed
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});
