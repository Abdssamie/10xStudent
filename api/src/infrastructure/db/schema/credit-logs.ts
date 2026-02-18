import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

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
  (table) => [
    // Indexes for audit queries
    index("credit_logs_user_id_idx").on(table.userId),
    index("credit_logs_timestamp_idx").on(table.timestamp.desc()),
  ],
);

// Type inference
export type CreditLog = typeof creditLogs.$inferSelect;
export type NewCreditLog = typeof creditLogs.$inferInsert;
