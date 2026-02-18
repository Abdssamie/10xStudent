import { Hono } from "hono";
import { errorHandler } from "@/middleware/error-handler";
import type { ServiceContainer } from "@/services/container";

/**
 * Create a test Hono app with mocked auth middleware
 * Used for route integration testing
 */
export function createTestApp(serviceContainer: ServiceContainer, userId: string): Hono {
  const app = new Hono();

  // Mock auth middleware - inject test user context
  app.use("*", async (c, next) => {
    c.set("auth", {
      userId,
      sessionId: "test-session-id",
      orgId: undefined,
    });
    c.set("services", serviceContainer);
    await next();
  });

  return app;
}

/**
 * Create a test app with a specific router mounted
 */
export function createTestAppWithRouter(
  serviceContainer: ServiceContainer,
  userId: string,
  router: Hono,
  basePath: string
): Hono {
  const app = createTestApp(serviceContainer, userId);
  app.route(basePath, router);
  app.onError(errorHandler);
  return app;
}
