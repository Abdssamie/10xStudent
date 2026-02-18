/**
 * Credits API routes
 * Exposes user credit balance and transaction history.
 */

import { Hono } from "hono";
import { schema, eq } from "@/infrastructure/db";
import { desc, sql } from "drizzle-orm";
import { NotFoundError } from "@/infrastructure/errors";

const { users, creditLogs } = schema;

export const creditsRouter = new Hono();

// GET /credits - Get user credit balance
creditsRouter.get("/", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;

  const [user] = await db
    .select({
      balance: users.credits,
      creditsResetAt: users.creditsResetAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Calculate usage this month (since last reset)
  const [usage] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${creditLogs.cost}), 0)`,
    })
    .from(creditLogs)
    .where(
      sql`${creditLogs.userId} = ${userId} AND ${creditLogs.timestamp} >= ${user.creditsResetAt}`,
    );

  return c.json({
    balance: user.balance,
    creditsResetAt: user.creditsResetAt,
    usedThisMonth: usage?.total ?? 0,
  });
});

// GET /credits/history - Get paginated transaction log
creditsRouter.get("/history", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;

  // Pagination params
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit")) || 50, 50);

  // Build query
  let query = db
    .select({
      id: creditLogs.id,
      operation: creditLogs.operation,
      cost: creditLogs.cost,
      tokensUsed: creditLogs.tokensUsed,
      timestamp: creditLogs.timestamp,
    })
    .from(creditLogs)
    .where(eq(creditLogs.userId, userId))
    .orderBy(desc(creditLogs.timestamp))
    .limit(limit + 1); // Fetch one extra to check hasMore

  // Apply cursor if provided
  if (cursor) {
    query = db
      .select({
        id: creditLogs.id,
        operation: creditLogs.operation,
        cost: creditLogs.cost,
        tokensUsed: creditLogs.tokensUsed,
        timestamp: creditLogs.timestamp,
      })
      .from(creditLogs)
      .where(
        sql`${creditLogs.userId} = ${userId} AND ${creditLogs.id} < ${cursor}`,
      )
      .orderBy(desc(creditLogs.timestamp))
      .limit(limit + 1);
  }

  const logs = await query;

  // Check if there are more results
  const hasMore = logs.length > limit;
  const results = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

  return c.json({
    logs: results,
    hasMore,
    cursor: nextCursor,
  });
});
