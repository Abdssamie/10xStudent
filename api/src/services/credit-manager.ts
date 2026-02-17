import { DB, schema, eq, sql } from "@/database";
import { NotFoundError, InsufficientCreditsError } from "@/errors";

const { users, creditLogs } = schema;

export class CreditManager {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Check if user has enough credits (with pessimistic lock)
   * Returns locked user record or throws error
   */
  async reserveCredits(
    userId: string,
    estimatedCost: number,
  ): Promise<{
    userId: string;
    reservedAmount: number;
    remainingCredits: number;
  }> {
    return await this.db.transaction(async (tx) => {
      // Lock user row for update
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.credits < estimatedCost) {
        throw new InsufficientCreditsError(
          `Insufficient credits. Have: ${user.credits}, Need: ${estimatedCost}`,
          { available: user.credits, required: estimatedCost }
        );
      }

      // Reserve credits (subtract)
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${estimatedCost}` })
        .where(eq(users.id, userId));

      return {
        userId,
        reservedAmount: estimatedCost,
        remainingCredits: user.credits - estimatedCost,
      };
    });
  }

  /**
   * Deduct actual credits used and refund difference
   */
  async finalizeCredits(
    userId: string,
    operation: string,
    reservedAmount: number,
    actualCost: number,
    tokensUsed?: number,
  ): Promise<{ refunded: number; finalCost: number }> {
    return await this.db.transaction(async (tx) => {
      const refund = reservedAmount - actualCost;

      if (refund > 0) {
        // Refund unused credits
        await tx
          .update(users)
          .set({ credits: sql`${users.credits} + ${refund}` })
          .where(eq(users.id, userId));
      } else if (refund < 0) {
        // Deduct additional credits if needed
        await tx
          .update(users)
          .set({ credits: sql`${users.credits} - ${Math.abs(refund)}` })
          .where(eq(users.id, userId));
      }

      // Log credit transaction
      await tx.insert(creditLogs).values({
        userId,
        operation,
        cost: actualCost,
        tokensUsed,
      });

      return { refunded: refund, finalCost: actualCost };
    });
  }

  /**
   * Rollback reserved credits on error
   */
  async rollbackCredits(userId: string, amount: number): Promise<void> {
    await this.db
      .update(users)
      .set({ credits: sql`${users.credits} + ${amount}` })
      .where(eq(users.id, userId));
  }
}
