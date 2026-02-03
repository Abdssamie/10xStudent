import { Hono } from 'hono';

/**
 * @id: api-router
 * @priority: high
 * @progress: 50
 * @spec: Main router. Registers sub-routes:
 * - /projects (CRUD)
 * - /documents (CRUD + Compilation)
 * - /chat (Agent interaction)
 * @skills: ["hono"]
 */

export const appRouter = new Hono();

appRouter.get('/', (c) => c.json({ message: 'Welcome to 10xStudent API' }));

