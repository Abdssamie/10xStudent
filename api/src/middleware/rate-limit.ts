import { createMiddleware } from "hono/factory";

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

export function rateLimitMiddleware(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    const auth = c.get("auth");
    const userId = auth?.userId;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const now = Date.now();
    const userLimit = store[userId];

    if (!userLimit || now > userLimit.resetAt) {
      // Reset window
      store[userId] = {
        count: 1,
        resetAt: now + windowMs,
      };
      return next();
    }

    if (userLimit.count >= maxRequests) {
      const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
      c.header("Retry-After", retryAfter.toString());
      return c.json(
        {
          error: "Rate limit exceeded",
          retryAfter,
        },
        429,
      );
    }

    userLimit.count++;
    return next();
  });
}
