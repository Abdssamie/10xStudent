import { OpenAPIHono } from "@hono/zod-openapi";

import { constructApiRoute } from "@/utils/router";
import { env } from "@/config/env";
import { assetsRouter } from "./assets";
import { chatRouter } from "./chat";
import { citationsRouter } from "./citations";
import { creditsRouter } from "./credits";
import { documentsRouter } from "./documents";
import { sourcesRouter } from "./sources";


export const appRouter = new OpenAPIHono();

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
  constructApiRoute("/assets"), assetsRouter
);
appRouter.route(
  constructApiRoute("/sources"), sourcesRouter
);
appRouter.route(
  constructApiRoute("/chat"), chatRouter
);
appRouter.route(
  constructApiRoute("/citations"), citationsRouter
);

// OpenAPI spec endpoint
appRouter.doc31(constructApiRoute("/doc"), {
  openapi: "3.1.0",
  info: {
    version: "1.0.0",
    title: "10xStudent API",
    description: "AI-powered research platform API",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Development server",
    },
  ],
});
