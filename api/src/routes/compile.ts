import { Hono } from "hono";
import { rateLimitMiddleware } from "@/middleware/rate-limit";

export const compileRouter = new Hono();

// Apply rate limiting: 10 compilations per minute
compileRouter.use("/", rateLimitMiddleware(10, 60000));

// TODO: Implement compile endpoint in Phase 2
// This will compile Typst documents to PDF
compileRouter.post("/", async (c) => {
  return c.json({ error: "Compile endpoint not yet implemented" }, 501);
});
