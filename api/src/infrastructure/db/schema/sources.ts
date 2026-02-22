import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { documents } from "./documents";
import { type SourceType } from "@shared/source-type";

// Source metadata type
export type SourceMetadata = {
  sourceType: "web" | "manual";
  isAvailable: boolean;
  extractedAt?: string;
};

// Sources table schema with pgvector
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    citationKey: text("citation_key"), // Unique key for Typst (e.g., @smith2023)
    title: text("title"),
    author: text("author"),
    publicationDate: timestamp("publication_date", { withTimezone: true }),
    accessDate: timestamp("access_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    content: text("content"), // Extracted text for RAG
    embedding: vector("embedding", { dimensions: 1024 }), // Voyage AI voyage-4-lite, nullable
    sourceType: text("source_type")
      .$type<SourceType>()
      .notNull()
      .default("website"), // Detected or manually overridden
    metadata: jsonb("metadata").$type<SourceMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Indexes for performance
    index("sources_document_id_idx").on(table.documentId),
    // Ensure citation keys are unique per document to avoid collisions in Typst
    index("sources_citation_key_idx").on(table.documentId, table.citationKey), 
  ],
);

// Type inference
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
