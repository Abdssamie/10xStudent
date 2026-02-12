import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth";
import { chatRouter } from "./chat";
import { creditsRouter } from "./credits";
import { documentsRouter } from "./documents";
import { sourcesRouter } from "./sources";

export const appRouter = new Hono();

appRouter.get("/", (c) => c.json({ message: "Welcome to 10xStudent API" }));

// Protected Routes (with rate limiting)
appRouter.use("/*", authMiddleware);

// Mount chat and compile routes (rate limiting applied in route files)
appRouter.route("/chat", chatRouter);
appRouter.route("/credits", creditsRouter);
appRouter.route("/documents", documentsRouter);
appRouter.route("/sources", sourcesRouter);
