import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * @id: credit-logs-schema
 * @priority: medium
 * @progress: 100
 * @directive: Implement credit_logs table for audit trail of all credit operations
 * @context: specs/01-database-api-foundation.md#credit-system
 * @checklist: [
 *   "✅ Define credit_logs table with id, userId, operation, cost, tokensUsed, timestamp",
 *   "✅ Add operation text field (typst_generation, web_search, rag_query)",
 *   "✅ Add cost integer field for credits deducted",
 *   "✅ Add tokensUsed integer field (nullable) for AI operations",
 *   "✅ Add timestamp with default now()",
 *   "✅ Define foreign key to users with cascade delete",
 *   "✅ Create index on userId and timestamp for audit queries"
 * ]
 * @deps: ["users-schema"]
 * @skills: ["drizzle-orm", "postgresql", "typescript"]
 */

// Credit logs table schema
export const creditLogs = pgTable(
  "credit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    operation: text("operation").notNull(), // 'typst_generation' | 'web_search' | 'rag_query'
    cost: integer("cost").notNull(),
    tokensUsed: integer("tokens_used"), // Nullable for non-AI operations
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Indexes for audit queries
    userIdIdx: index("credit_logs_user_id_idx").on(table.userId),
    timestampIdx: index("credit_logs_timestamp_idx").on(table.timestamp),
  }),
);

// Type inference
export type CreditLog = typeof creditLogs.$inferSelect;
export type NewCreditLog = typeof creditLogs.$inferInsert;
