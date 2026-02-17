/**
 * Rate limiting middleware
 * Protects API endpoints from abuse using sliding window algorithm
 */

import { createMiddleware } from "hono/factory";
import { TooManyRequestsError } from "@/errors";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// In-memory store for rate limiting
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key]?.resetAt && store[key].resetAt < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limiter options
 */
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: any) => string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Create a rate limiter middleware with custom options
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => c.get("auth")?.userId || c.req.header("x-forwarded-for") || "anonymous",
    skipSuccessfulRequests = false,
  } = options;

  return createMiddleware(async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    const entry = store[key];

    // Initialize or reset window
    if (!entry || now > entry.resetAt) {
      store[key] = {
        count: 1,
        resetAt: now + windowMs,
      };

      // Set rate limit headers
      c.header("X-RateLimit-Limit", maxRequests.toString());
      c.header("X-RateLimit-Remaining", (maxRequests - 1).toString());
      c.header("X-RateLimit-Reset", new Date(store[key].resetAt).toISOString());

      await next();
      return;
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      
      logger.warn(
        {
          key,
          userId: c.get("auth")?.userId,
          path: c.req.path,
          method: c.req.method,
          count: entry.count,
          limit: maxRequests,
        },
        "Rate limit exceeded"
      );

      c.header("X-RateLimit-Limit", maxRequests.toString());
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", new Date(entry.resetAt).toISOString());
      c.header("Retry-After", retryAfter.toString());

      throw new TooManyRequestsError(
        "Rate limit exceeded. Please try again later.",
        { retryAfter, limit: maxRequests, window: windowMs }
      );
    }

    // Increment counter
    entry.count++;

    // Set rate limit headers
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", (maxRequests - entry.count).toString());
    c.header("X-RateLimit-Reset", new Date(entry.resetAt).toISOString());

    await next();
  });
}

/**
 * Default rate limiter for authenticated routes
 * 100 requests per minute per user
 */
export const rateLimitMiddleware = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

/**
 * Strict rate limiter for AI-heavy endpoints
 * 10 requests per minute per user
 */
export const strictRateLimitMiddleware = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

/**
 * Rate limiter for webhook endpoints (by IP)
 * 50 requests per minute per IP
 */
export const webhookRateLimitMiddleware = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
  keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
});

