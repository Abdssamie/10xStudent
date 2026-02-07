import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth";
import { chatRouter } from "./chat";
import { compileRouter } from "./compile";

/**
 * @id: api-router
 * @priority: high
 * @progress: 30
 * @directive: Main Hono router for the API server - registers all sub-routes
 * @context: specs/00-system-architecture-integration.md#backend-api
 * @spec: Main router. According to spec, should register:
 * - /api/documents (CRUD)
 * - /api/sources (CRUD + RAG)
 * - /api/credits (balance + history)
 * - /api/compile (Typst compilation)
 * - /api/chat (TanStack AI endpoint)
 * Note: Projects concept removed per spec - documents belong directly to users
 * @skills: ["hono"]
 */

export const appRouter = new Hono();

appRouter.get("/", (c) => c.json({ message: "Welcome to 10xStudent API" }));

// Protected Routes (with rate limiting)
appRouter.use("/*", authMiddleware);

// Mount chat and compile routes (rate limiting applied in route files)
appRouter.route("/chat", chatRouter);
appRouter.route("/compile", compileRouter);

// TODO: Add remaining routes per spec:
// appRouter.route('/documents', documentsRouter);
// appRouter.route('/sources', sourcesRouter);
// appRouter.route('/credits', creditsRouter);
