import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";

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

// Protected Routes
appRouter.use("/*", authMiddleware);
// TODO: Add routes per spec:
// appRouter.route('/documents', documentsRouter);
// appRouter.route('/sources', sourcesRouter);
// appRouter.route('/credits', creditsRouter);
