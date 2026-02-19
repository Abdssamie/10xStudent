/**
 * Rate limiting middleware using Redis with sliding window algorithm
 * Protects API endpoints from abuse with per-user rate limiting
 */

import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import type Redis from "ioredis";
import { TooManyRequestsError } from "@/infrastructure/errors";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Rate limiter options
 */
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipUnauthenticated?: boolean;
}

/**
 * Create a rate limiter middleware with Redis-backed sliding window algorithm
 * 
 * Algorithm:
 * - Uses Redis sorted sets to track request timestamps
 * - Each request adds a timestamp to the sorted set
 * - Old timestamps outside the window are removed
 * - Count of timestamps in window determines if limit is exceeded
 * - Fails open if Redis is unavailable (logs error but allows request)
 */
export function createRateLimitMiddleware(
  redis: Redis,
  options: RateLimitOptions
) {
  const {
    windowMs,
    maxRequests,
    keyPrefix = "ratelimit",
  } = options;

  return createMiddleware(async (c: Context, next) => {
    const userId = c.get("auth")?.userId;

    if (!userId) {
      logger.warn(
        {
          path: c.req.path,
          method: c.req.method,
        },
        "Rate limiting skipped - no user ID available"
      );
      await next();
      return;
    }

    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();

      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

      const results = await pipeline.exec();

      if (!results) {
        throw new Error("Redis pipeline returned null");
      }

      const countResult = results[1];
      if (!countResult || countResult[0]) {
        throw new Error("Failed to get request count from Redis");
      }

      const currentCount = countResult[1] as number;
      const remaining = Math.max(0, maxRequests - currentCount - 1);
      const resetAt = now + windowMs;

      c.header("X-RateLimit-Limit", maxRequests.toString());
      c.header("X-RateLimit-Remaining", remaining.toString());
      c.header("X-RateLimit-Reset", new Date(resetAt).toISOString());

      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);

        logger.warn(
          {
            userId,
            path: c.req.path,
            method: c.req.method,
            count: currentCount,
            limit: maxRequests,
            windowMs,
          },
          "Rate limit exceeded"
        );

        c.header("Retry-After", retryAfter.toString());

        throw new TooManyRequestsError(
          "Rate limit exceeded. Please try again later.",
          { retryAfter, limit: maxRequests, windowMs }
        );
      }

      await next();
    } catch (err) {
      if (err instanceof TooManyRequestsError) {
        throw err;
      }

      logger.error(
        {
          err,
          userId,
          path: c.req.path,
          method: c.req.method,
        },
        "Rate limiting failed - allowing request (fail open)"
      );

      await next();
    }
  });
}

/**
 * Default rate limiter for authenticated routes
 * Uses environment configuration
 */
export function createDefaultRateLimiter(redis: Redis) {
  return createRateLimitMiddleware(redis, {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    keyPrefix: "ratelimit:api",
    skipUnauthenticated: true,
  });
}

/**
 * Strict rate limiter for AI-heavy endpoints
 * Uses environment configuration for AI limits
 */
export function createStrictRateLimiter(redis: Redis) {
  return createRateLimitMiddleware(redis, {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_AI_MAX_REQUESTS,
    keyPrefix: "ratelimit:ai",
    skipUnauthenticated: true,
  });
}
