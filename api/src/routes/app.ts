import { Hono } from "hono";
import { creditsRouter } from "./credits";
import { documentsRouter } from "./documents";
import { sourcesRouter } from "./sources";
import { webhooksRouter } from "./webhooks";
import { constructApiRoute } from "@/utils/router";
import { env } from "@/config/env";


export const appRouter = new Hono();

appRouter.get("/", (c) => c.json({ message: "Welcome to 10xStudent API" }));

// Debug endpoint for testing Sentry (development only)
if (env.NODE_ENV === "development") {
  appRouter.get(constructApiRoute("/debug-sentry"), (c) => {
    throw new Error("Test error for Sentry integration");
  });
}

// Mount routes (rate limiting applied in route files)
appRouter.route(
  constructApiRoute("/credits"), creditsRouter
);
appRouter.route(
  constructApiRoute("/documents"), documentsRouter
);
appRouter.route(
  constructApiRoute("/sources"), sourcesRouter
);

appRouter.route(
  constructApiRoute("/webhooks"), webhooksRouter  
)
