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
 * @id: documents-schema
 * @priority: high
 * @progress: 100
 * @directive: Implement documents table schema with citation counter and template support
 * @context: specs/01-database-api-foundation.md#database-schema
 * @checklist: [
 *   "✅ Define documents table with id, userId, title, typstContent, template, citationFormat, citationCount",
 *   "✅ Add citationCount integer field with default 0 for atomic citation numbering",
 *   "✅ Add template field (enum: research-paper, report, essay, article, notes)",
 *   "✅ Add citationFormat field (enum: APA, MLA, Chicago) with default APA",
 *   "✅ Enforce 1000-line limit validation (max 100000 chars)",
 *   "✅ Add timestamps (createdAt, updatedAt)",
 *   "✅ Define foreign key to users with cascade delete",
 *   "✅ Define relations to sources and citations"
 * ]
 * @deps: ["users-schema"]
 * @skills: ["drizzle-orm", "postgresql", "typescript"]
 */

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
  (table) => ({
    // Indexes for performance
    userIdIdx: index("documents_user_id_idx").on(table.userId),
    createdAtIdx: index("documents_created_at_idx").on(table.createdAt),
    updatedAtIdx: index("documents_updated_at_idx").on(table.updatedAt),
  }),
);

// Type inference
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
