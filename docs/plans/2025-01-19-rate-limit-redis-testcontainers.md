# Rate Limit Test Refactor - Redis Testcontainers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace heavy Redis mocking with real Redis testcontainer for authentic integration testing of rate limiting middleware.

**Architecture:** Use @testcontainers/redis to spin up a real Redis instance, connect with ioredis client, and test against actual Redis operations instead of mocked behavior. This provides higher confidence that rate limiting works correctly in production.

**Tech Stack:** @testcontainers/redis, ioredis, vitest, Hono

---

## Task 1: Set up Redis testcontainer infrastructure

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:1-271`

**Step 1: Update imports to use testcontainers**

Replace the mock Redis imports with real testcontainer and ioredis imports:

```typescript
/**
 * Rate limiting middleware tests
 * Tests Redis-backed sliding window rate limiting with real Redis instance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Hono } from "hono";
import Redis from "ioredis";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { createRateLimitMiddleware } from "../../src/middleware/rate-limit";
import { TooManyRequestsError } from "../../src/infrastructure/errors";
```

**Step 2: Remove mock Redis implementation**

Delete lines 12-62 (the entire createMockRedis function and related code).

**Step 3: Add container lifecycle variables**

Add these variables at the top of the describe block:

```typescript
describe("Rate Limiting Middleware", () => {
  let app: Hono;
  let redisContainer: StartedRedisContainer;
  let redis: Redis;
```

**Step 4: Commit infrastructure setup**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: setup Redis testcontainer infrastructure for rate-limit tests"
```

---

## Task 2: Implement container lifecycle management

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:64-86`

**Step 1: Add beforeAll hook to start Redis container**

Replace the existing beforeEach (lines 68-82) with:

```typescript
  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new RedisContainer().start();
    
    // Create Redis client
    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getPort(),
    });
  }, 60000); // 60 second timeout for container startup
```

**Step 2: Add afterAll hook to cleanup container**

Replace the existing afterEach (lines 84-86) with:

```typescript
  afterAll(async () => {
    // Disconnect Redis client
    if (redis) {
      await redis.quit();
    }
    
    // Stop container
    if (redisContainer) {
      await redisContainer.stop();
    }
  });
```

**Step 3: Add beforeEach hook to clean Redis data**

Add a new beforeEach to ensure clean state between tests:

```typescript
  beforeEach(async () => {
    // Clean all Redis data between tests
    await redis.flushall();
    
    // Create fresh Hono app for each test
    app = new Hono();
    
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
```

**Step 4: Run tests to verify ciner setup**

Run: `bun test api/tests/middleware/rate-limit.test.ts`
Expected: Tests should fail because we haven't updated the test bodies yet, but container should start/stop successfully.

**Step 5: Commit lifecycle management**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: add Redis container lifecycle management with cleanup"
```

---

## Task 3: Update test cases to use real Redis

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:88-109`

**Step 1: Update "should allow requests within rate limit" test**

Replace lines 88-109 with:

```typescript
  it("should allow requests within rate limit", async () => {
    // Mock auth context FIRST (middleware order matters!)
    app.use("*", async (c, next) => {
      c.set("auth", { userId: "user123", sessionId: "session123" });
      await next();
    });

    const rateLimiter = createRateLimitMiddleware(redis, {
      windowMs: 60000,
      maxRequests: 5,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    app.use("*", rateLimiter);
    app.get("/test", (c) => c.json({ success: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });
```

**Step 2: Run test to verify it passes**

Run: `bun test api/tests/middleware/rate-limit.test.ts -t "should allow requests within rate limit"`
Expected: PASS

**Step 3: Commit first test update**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: update 'allow requests within limit' to use real Redis"
```

---

## Task 4: Update rate limit blocking test

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:111-140`

**Step 1: Update "should block requests exceeding rate limit" test**

Replace lines 111-140 with:

```typescript
  it("should block requests exceeding rate limit", async () => {
    const rateLimiter = createRateLimitMiddleware(redis, {
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
```

**Step 2: Run test to verify it passes**

Run: `bun test api/tests/middleware/rate-limit.test.ts -t "sd block requests exceeding"`
Expected: PASS

**Step 3: Commit blocking test update**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: update rate limit blocking test to use real Redis"
```

---

## Task 5: Update unauthenticated skip test

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:142-159`

**Step 1: Update "should skip rate limiting for unauthenticated users" test**

Replace lines 142-159 with:

```typescript
  it("should skip rate limiting for unauthenticated users when configured", async () => {
    const rateLimiter = createRateLimitMiddleware(redis, {
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
```

**Step 2: Run test to verify it passes**

Run: `bun test api/tests/middleware/rate-limit.test.ts -t "should skip rate limiting"`
Expected: PASS

**Step 3: Commit unauthenticated test update**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: update unauthenticated skip test to use real Redis"
```

---

## Task 6: Update rate limit headers test

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:161-186`

**Step 1: Update "should include correct rate limit headers" test**

Replace lines 161-186 with:

```typescript
  it("should include correct rate limit headers", async () => {
    const rateLimiteRateLimitMiddleware(redis, {
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: "test",
      skipUnauthenticated: false,
    });

    a("*", async (c, next) => {
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
```

**Step 2: Run test to verify it passes**

Run: `bun test api/tests/middleware/rate-limit.test.ts -t "should include correct rate limit headers"`
Expected: PASS

**Step 3: Commit headers test update**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: update rate limit headers test to use real Redis"
```

---

## Task 7: Update different users test

**Files:**
- Modify: `api/tests/middleware/rate-limit.test.ts:188-241`

**Step 1: Update "should use different keys for different users" test**

Replace lines 188-241 with:

```typescript
  it("should use different keys for different users", async () => {
    const rateLimiter = createRateLimitMiddleware(redis, {
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
    app1.use("*", async ({
      c.set("auth", { userId: "user1", sessionId: "session1" });
      await next();
    });
    app1.use("*", rateLimiter);
    app1.get("/test", (c) => c.json({ success: true }));

    const res1 = await app1.request("/test");
    expect(res1.status).toBe(200);

    // User 1 - second request (should be rate limited)
    const res2 = await app1.request("/te;
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
```

**Step 2: Run test to verify it passes**

Run: `bun test api/tests/middleware/rate-limit.test.ts -t "should use different keys"`
Expected: PASS

**Step 3: Commit different users test update**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: update different users test to use real Redis"
```

---

## Task 8: Update Redis error handling test

**Files:**
- Modify: s/middleware/rate-limit.test.ts:243-269`

**Step 1: Update "should fail open when Redis errors occur" test**

Replace lines 243-269 with:

```typescript
  it("should fail open when Redis errors occur", async () => {
    // Create a Redis client with invalid connection to simulate errors
    const errorRedis = new Redis({
      host: "invalid-host-that-does-not-exist",
      port: 9999,
      retryStrategy: () => null, // Don't retry
      lazyConnect: true, // Don't connect immediately
    });

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
    
    // Cleanup
    errorRedis.disconnect();
  });
```

**Step 2: Run test to verify it passes**

Run: `bun test api/tests/middleware/rate-limit.test.ts -t "should fail open"`
Expected: PASS

**Step 3: Commit error handling test update**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: update Redis error handling test to use real Redis"
```

---

## Task 9: Run full test suite and verify

**Files:**
- Test: `api/tests/middleware/rate-limit.test.ts`

**Step 1: Run complete test suite**

Run: `bun test api/tests/middleware/rate-limit.test.ts`
Expected: All 7 tests PASS

**Step 2: Verify test output shows real Redis usage**

Check that logs show:
- Container starting
- Redis connection established
-  tests passing
- Container cleanup

**Step 3: Run tests multiple times to verify stability**

Run: `bun test api/tests/middleware/rate-limit.test.ts --reporter=verbose`
Run it 3 times to ensure no flakiness.
Expected: Consistent PASS on all runs

**Step 4: Final commit with test verification**

```bash
git add api/tests/middleware/rate-limit.test.ts
git commit -m "test: complete Redis testcontainer migration - all tests passing"
```

---

## Verification Checklist

- [ ] All 7 tests pass consistently
- [ ] Redis container starts and stops cleanly
- [ ] No mock Redis code remains
- [ ] Tests use real Redis operations (ZADD, ZCARD, etc.)
- [ ] Data cleanup between tests works (flushall)
- [ ] Container timeout is reasonable (60s)
- [ ] Error handling test properly simulates Redis failure
- [ ] Tests run in isolation without side effects

---

## Benefits of This Refactor

1. **Real Integration Testing**: Tests actual Redis behavior, not mocked approximations
2. **Higher Confidence**: Catches Redis-specific issues (pipeline behavior, data types, etc.)
3. **Simpler Code**: No complex mock implementation to maintain
4. **Production Parity**: Tests run against same Redis version ason
5. **Better Debugging**: Can inspect actual Redis data during test failures
