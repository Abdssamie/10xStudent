import {
  pgTable,
  uuid,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * @id: users-schema
 * @priority: high
 * @progress: 100
 * @directive: Implement users table schema with Drizzle ORM including credits system and preferences
 * @context: specs/01-database-api-foundation.md#database-schema
 * @checklist: [
 *   "✅ Define users table with id (Clerk userId), credits, creditsResetAt, preferences, timestamps",
 *   "✅ Set default credits to 10000",
 *   "✅ Add preferences JSONB field for defaultCitationFormat and defaultResearchDepth",
 *   "✅ Add creditsResetAt timestamp for monthly reset tracking",
 *   "✅ Define relations to documents, sources, and credit_logs",
 *   "✅ Export schema and relations for Drizzle ORM"
 * ]
 * @deps: []
 * @skills: ["drizzle-orm", "postgresql", "typescript"]
 */

// User preferences type
export type UserPreferences = {
  defaultCitationFormat: "APA" | "MLA" | "Chicago";
  defaultResearchDepth: "quick" | "deep";
};

// Users table schema
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // Clerk userId
    credits: integer("credits").notNull().default(10000),
    preferences: jsonb("preferences").$type<UserPreferences>(),
    creditsResetAt: timestamp("credits_reset_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Index for credit queries
    index("users_credits_idx").on(table.credits),
  ],
);

// User relations - will be defined after all tables are created
// Relations are exported from index.ts to avoid circular dependencies

// Type inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
