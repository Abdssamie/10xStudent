/**
 * Credits API routes
 * Exposes user credit balance and transaction history.
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { desc, sql } from "drizzle-orm";

import {
  creditsBalanceResponseSchema,
  creditsHistoryResponseSchema,
} from "@shared/api/credits";

import { schema, eq } from "@/infrastructure/db";
import { NotFoundError } from "@/infrastructure/errors";

const { users, creditLogs } = schema;

export const creditsRouter = new OpenAPIHono();

const getCreditsBalanceRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: creditsBalanceResponseSchema,
        },
      },
      description: "User credit balance and usage",
    },
  },
  tags: ["Credits"],
});

creditsRouter.openapi(getCreditsBalanceRoute, async (c) => {
  const userContext = c.get("user");
  const userId = userContext.id;
  const services = c.get("services");
  const db = services.db;

  const [userRecord] = await db
    .select({
      balance: users.credits,
      creditsResetAt: users.creditsResetAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRecord) {
    throw new NotFoundError("User not found");
  }

  const [usage] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${creditLogs.cost}), 0)`,
    })
    .from(creditLogs)
    .where(
      sql`${creditLogs.userId} = ${userId} AND ${creditLogs.timestamp} >= ${userRecord.creditsResetAt}`,
    );

  return c.json({
    balance: userRecord.balance,
    creditsResetAt: userRecord.creditsResetAt,
    usedThisMonth: usage?.total ?? 0,
  });
});

const getCreditsHistoryRoute = createRoute({
  method: "get",
  path: "/history",
  request: {
    query: z.object({
      cursor: z.string().uuid().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: creditsHistoryResponseSchema,
        },
      },
      description: "Paginated credit transaction history",
    },
  },
  tags: ["Credits"],
});

creditsRouter.openapi(getCreditsHistoryRoute, async (c) => {
  const userContext = c.get("user");
  const userId = userContext.id;
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
