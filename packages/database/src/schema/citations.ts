import { pgTable, uuid, integer, timestamp, index } from "drizzle-orm/pg-core";
import { documents } from "./documents";
import { sources } from "./sources";

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
      table.citationNumber.asc(),
    ),
    sourceIdIdx: index("citations_source_id_idx").on(table.sourceId),
  }),
);

// Type inference
export type Citation = typeof citations.$inferSelect;
export type NewCitation = typeof citations.$inferInsert;
