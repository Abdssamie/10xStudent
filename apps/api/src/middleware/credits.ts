/**
 * @id: credits-middleware
 * @priority: medium
 * @progress: 100
 * @directive: Implement credit checking middleware to block operations when insufficient credits
 * @context: specs/01-database-api-foundation.md#credit-system
 * @checklist: [
 *   "✅ Create canUseAi helper function",
 *   "✅ Block AI endpoints when credits are zero",
 *   "✅ Create middleware to check credits from database",
 *   "✅ Return 402 Payment Required when credits exhausted"
 * ]
 * @deps: ["users-schema", "auth-middleware"]
 * @skills: ["hono", "drizzle-orm", "typescript"]
 */

import { createMiddleware } from "hono/factory";
import { db, schema, eq } from "@10xstudent/database";

const { users } = schema;

/**
 * Check if user has sufficient credits to use AI features
 * @param credits - User's current credit balance
 * @returns true if user can use AI, false otherwise
 */
export function canUseAi(credits: number): boolean {
  return credits > 0;
}

/**
 * Middleware to enforce credit requirements for AI endpoints
 * Blocks requests when user has zero or negative credits
 */
export const checkAiCreditsMiddleware = createMiddleware(async (c, next) => {
  const auth = c.get("auth");
  const userId = auth?.userId;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Query user's current credits
  const [user] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check if user can use AI
  if (!canUseAi(user.credits)) {
    return c.json(
      {
        error: "Insufficient credits",
        credits: user.credits,
        message:
          "You need credits to use AI features. Please purchase more credits.",
      },
      402, // Payment Required
    );
  }

  // User has credits, proceed with request
  await next();
});
