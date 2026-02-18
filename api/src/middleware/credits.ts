import { createMiddleware } from "hono/factory";
import { db, schema, eq } from "@/infrastructure/db";
import { UnauthorizedError, NotFoundError, InsufficientCreditsError } from "@/infrastructure/errors";

const { users } = schema;

/**
 * Check if a user can use AI features based on their credit balance
 * @param credits - The user's current credit balance
 * @returns true if user has positive credits, false otherwise
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
    throw new UnauthorizedError();
  }

  // Query user's current credits
  const [user] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if user can use AI
  if (user.credits <= 0) {
    throw new InsufficientCreditsError(
      "You need credits to use AI features. Please purchase more credits.",
      { credits: user.credits }
    );
  }

  // User has credits, proceed with request
  await next();
});
