import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// User preferences type
export type UserPreferences = {
  defaultCitationFormat: "APA" | "MLA" | "Chicago";
  defaultResearchDepth: "quick" | "deep";
};

// Users table schema
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(), // Clerk userId (e.g., user_39toVf97YjjeeCwdZthKcF3Pzdf)
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
    index("users_clerk_id_idx").on(table.clerkId),
    index("users_credits_idx").on(table.credits),
  ],
);

// User relations - will be defined after all tables are created
// Relations are exported from index.ts to avoid circular dependencies

// Type inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
