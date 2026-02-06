import { Hono } from "hono";
import { rateLimitMiddleware } from "../middleware/rate-limit";

export const chatRouter = new Hono();

// Apply rate limiting: 10 requests per minute
chatRouter.use("/", rateLimitMiddleware(10, 60000));

// TODO: Implement chat endpoint in Phase 2
// This will be the single /api/chat endpoint for TanStack AI
chatRouter.post("/", async (c) => {
  return c.json({ error: "Chat endpoint not yet implemented" }, 501);
});
