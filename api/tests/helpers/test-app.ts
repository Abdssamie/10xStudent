import { Hono } from "hono";
import { errorHandler } from "@/middleware/error-handler";
import type { ServiceContainer } from "@/services/container";

export interface TestUserContext {
  clerkId: string;
  id: string;
}

export function createTestApp(serviceContainer: ServiceContainer, userContext: TestUserContext): Hono {
  const app = new Hono();

  app.use("*", async (c, next) => {
    c.set("auth", {
      userId: userContext.clerkId,
      sessionId: "test-session-id",
      orgId: undefined,
    });
    c.set("user", {
      id: userContext.id,
      clerkId: userContext.clerkId,
    });
    c.set("services", serviceContainer);
    await next();
  });

  return app;
}

export function createTestAppWithRouter(
  serviceContainer: ServiceContainer,
  userContext: TestUserContext,
  router: Hono,
  basePath: string
): Hono {
  const app = createTestApp(serviceContainer, userContext);
  app.route(basePath, router);
  app.onError(errorHandler);
  return app;
}
