import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Documents table schema
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    typstKey: text("typst_key").notNull(), // S3/R2 path to main.typ
    bibKey: text("bib_key"), // S3/R2 path to refs.bib (optional)
    template: text("template").notNull(), // 'research-paper' | 'report' | 'essay' | 'article' | 'notes'
    citationFormat: text("citation_format").notNull().default("APA"), // 'APA' | 'MLA' | 'Chicago'
    citationCount: integer("citation_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Indexes for performance
    index("documents_user_id_idx").on(table.userId),
    index("documents_created_at_idx").on(table.createdAt.desc()),
    index("documents_updated_at_idx").on(table.updatedAt.desc()),
  ],
);

// Type inference
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
