/**
 * Sentry context middleware
 * Sets user context, tags, and breadcrumbs for error tracking
 */

import { Context, Next } from "hono";
import { Sentry } from "../lib/sentry.js";
import type { Scope } from "@sentry/node";

declare module "hono" {
  interface ContextVariableMap {
    sentryScope: Scope;
  }
}

/**
 * Middleware to set Sentry context for each request
 * Captures user information, request details, and adds breadcrumbs
 */
export async function sentryContext(c: Context, next: Next) {
  // Get current scope for this request
  const scope = Sentry.getCurrentScope();

  // Set user context from auth if available
  const auth = c.get("auth");
  if (auth?.userId) {
    scope.setUser({
      id: auth.userId,
      sessionId: auth.sessionId,
    });

    // Add userId as a tag for easier filtering
    scope.setTag("userId", auth.userId);
  }

  // Set request context tags
  scope.setTag("method", c.req.method);
  scope.setTag("path", c.req.path);

  // Add breadcrumb for the request
  Sentry.addBreadcrumb({
    category: "http",
    message: `${c.req.method} ${c.req.path}`,
    level: "info",
    data: {
      url: c.req.url,
      method: c.req.method,
    },
  });

  // Store scope in context for use in route handlers
  c.set("sentryScope", scope);

  await next();
}

/**
 * Helper to add operation breadcrumb
 */
export function addOperationBreadcrumb(
  c: Context,
  operation: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: "operation",
    message: operation,
    level: "info",
    data,
  });
}

/**
 * Helper to set operation tags
 */
export function setOperationTags(c: Context, tags: Record<string, string>) {
  const scope = c.get("sentryScope");
  if (scope) {
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  }
}

/**
 * Helper to start a performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    (span) => span
  );
}
