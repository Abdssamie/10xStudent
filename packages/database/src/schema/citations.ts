import { pgTable, uuid, integer, timestamp, index } from "drizzle-orm/pg-core";
import { documents } from "./documents";
import { sources } from "./sources";

/**
 * @id: citations-schema
 * @priority: high
 * @progress: 100
 * @directive: Implement citations table to track which sources are cited and where
 * @context: specs/04-source-management-rag.md#citation-management-system
 * @checklist: [
 *   "✅ Define citations table with id, documentId, sourceId, citationNumber, position",
 *   "✅ Add citationNumber integer field for sequential numbering",
 *   "✅ Add position integer field for character position in document",
 *   "✅ Add timestamps (createdAt)",
 *   "✅ Define foreign keys to documents and sources with cascade delete",
 *   "✅ Define relations to documents and sources",
 *   "✅ Create indexes on documentId and citationNumber for fast lookups"
 * ]
 * @deps: ["documents-schema", "sources-schema"]
 * @skills: ["drizzle-orm", "postgresql", "typescript"]
 */

// Citations table schema
export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    citationNumber: integer("citation_number").notNull(), // Sequential number from document.citationCount
    position: integer("position").notNull(), // Character position in document
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Indexes for fast lookups
    documentIdIdx: index("citations_document_id_idx").on(table.documentId),
    citationNumberIdx: index("citations_citation_number_idx").on(
      table.documentId,
      table.citationNumber,
    ),
    sourceIdIdx: index("citations_source_id_idx").on(table.sourceId),
  }),
);

// Type inference
export type Citation = typeof citations.$inferSelect;
export type NewCitation = typeof citations.$inferInsert;
