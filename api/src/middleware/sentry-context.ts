/**
 * Sentry context middleware
 * Sets user context for error tracking
 * 
 * Note: Sentry automatically instruments HTTP requests, database queries,
 * and other operations. We only need to set user context here.
 */

import { Context, Next } from "hono";
import { Sentry } from "../lib/sentry.js";

/**
 * Middleware to set Sentry user context for each request
 * Sentry automatically captures request details, so we only set user info
 */
export async function sentryContext(c: Context, next: Next) {
  // Set user context from auth if available
  const auth = c.get("auth");
  if (auth?.userId) {
    Sentry.setUser({
      id: auth.userId,
      sessionId: auth.sessionId,
    });
  }

  await next();
}
