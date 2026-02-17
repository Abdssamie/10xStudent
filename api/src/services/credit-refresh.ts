import { db, schema, eq, sql } from "@/database";
import { lte } from "drizzle-orm";

const { users, creditLogs } = schema;

/**
 * Default monthly credit allowance for users
 */
const DEFAULT_MONTHLY_CREDITS = 10000;

/**
 * Result of credit refresh operation
 */
export interface CreditRefreshResult {
  userId: string;
  previousCredits: number;
  newCredits: number;
  refreshedAt: Date;
}

/**
 * Service for managing monthly credit refreshes
 */
export class CreditRefreshService {
  private db: typeof db;

  constructor(database: typeof db = db) {
    this.db = database;
  }

  /**
   * Find users whose credits need refreshing (creditsResetAt is older than 1 month)
   * 
   * @param batchSize - Maximum number of users to process in one batch
   * @returns Array of users needing refresh
   */
  async findUsersToRefresh(batchSize: number = 1000): Promise<
    Array<{
      id: string;
      credits: number;
      creditsResetAt: Date;
    }>
  > {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return await this.db
      .select({
        id: users.id,
        credits: users.credits,
        creditsResetAt: users.creditsResetAt,
      })
      .from(users)
      .where(lte(users.creditsResetAt, oneMonthAgo))
      .limit(batchSize);
  }

  /**
   * Refresh credits for a single user
   * 
   * @param userId - User ID to refresh
   * @returns Refresh result or null if user not found
   */
  async refreshUserCredits(userId: string): Promise<CreditRefreshResult | null> {
    return await this.db.transaction(async (tx) => {
      // Lock user row and get current state
      const [user] = await tx
        .select({
          id: users.id,
          credits: users.credits,
        })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user) {
        return null;
      }

      const now = new Date();
      const previousCredits = user.credits;

      // Update user credits and reset timestamp
      await tx
        .update(users)
        .set({
          credits: DEFAULT_MONTHLY_CREDITS,
          creditsResetAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      // Log the refresh operation
      await tx.insert(creditLogs).values({
        userId,
        operation: "monthly_refresh",
        cost: 0, // No cost for refresh
        tokensUsed: null,
      });

      return {
        userId,
        previousCredits,
        newCredits: DEFAULT_MONTHLY_CREDITS,
        refreshedAt: now,
      };
    });
  }

  /**
   * Refresh credits for all users whose reset date has passed
   * 
   * @param batchSize - Maximum users to process in one run
   * @returns Summary of refresh operation
   */
  async refreshAllCredits(batchSize: number = 1000): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: CreditRefreshResult[];
  }> {
    const usersToRefresh = await this.findUsersToRefresh(batchSize);
    
    const results: CreditRefreshResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const user of usersToRefresh) {
      try {
        const result = await this.refreshUserCredits(user.id);
        if (result) {
          results.push(result);
          successful++;
        }
      } catch (error) {
        console.error(`Failed to refresh credits for user ${user.id}:`, error);
        failed++;
      }
    }

    return {
      processed: usersToRefresh.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get refresh statistics for monitoring
   */
  async getRefreshStats(): Promise<{
    totalUsers: number;
    usersNeedingRefresh: number;
    lastRefreshDate: Date | null;
  }> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [needsRefreshResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(lte(users.creditsResetAt, oneMonthAgo));

    const [lastRefresh] = await this.db
      .select({ timestamp: sql<Date>`max(${creditLogs.timestamp})` })
      .from(creditLogs)
      .where(eq(creditLogs.operation, "monthly_refresh"));

    return {
      totalUsers: totalResult?.count ?? 0,
      usersNeedingRefresh: needsRefreshResult?.count ?? 0,
      lastRefreshDate: lastRefresh?.timestamp ?? null,
    };
  }
}
