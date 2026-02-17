import { Hono } from "hono";
import { chatRouter } from "./chat";
import { creditsRouter } from "./credits";
import { documentsRouter } from "./documents";
import { sourcesRouter } from "./sources";
import { webhooksRouter } from "./webhooks";
import { constructApiRoute } from "@/utils/router";


export const appRouter = new Hono();

appRouter.get("/", (c) => c.json({ message: "Welcome to 10xStudent API" }));


// Mount chat and compile routes (rate limiting applied in route files)
appRouter.route(
  constructApiRoute("/chat"), chatRouter
);
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
