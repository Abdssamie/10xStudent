import { Hono } from "hono";
import type { BlankEnv } from "hono/types";
import { errorHandler } from "@/middleware/error-handler";
import type { ServiceContainer } from "@/services/container";
import type { User } from "@/infrastructure/db/schema";

export interface TestUserContext {
  clerkId: string;
  id: string;
}

export function createTestApp(serviceContainer: ServiceContainer, user: User): Hono {
  const app = new Hono();

  app.use("*", async (c, next) => {
    c.set("auth", {
      userId: user.clerkId,
      sessionId: "test-session-id",
      orgId: undefined,
    });
    c.set("user", {
      id: user.id,
      clerkId: user.clerkId,
    });
    c.set("services", serviceContainer);
    await next();
  });

  return app;
}

export function createTestAppWithRouter<E extends BlankEnv>(
  serviceContainer: ServiceContainer,
  user: User,
  router: Hono<E>,
  basePath: string
): Hono {
  const app = createTestApp(serviceContainer, user);
  app.route(basePath, router);
  app.onError(errorHandler);
  return app;
}
