/**
 * Services middleware
 * Injects service container into Hono context for route handlers
 */

import { MiddlewareHandler } from "hono";
import type { ServiceContainer } from "@/services/container";

/**
 * Create middleware that injects service container into context
 * 
 * @param container - Service container to inject
 * @returns Hono middleware handler
 */
export function createServicesMiddleware(
  container: ServiceContainer
): MiddlewareHandler {
  return async (c, next) => {
    c.set("services", container);
    await next();
  };
}
