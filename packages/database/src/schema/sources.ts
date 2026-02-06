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

/**
 * @id: sources-schema
 * @priority: high
 * @progress: 100
 * @directive: Implement sources table schema with pgvector embeddings for RAG
 * @context: specs/04-source-management-rag.md#source-storage-metadata
 * @checklist: [
 *   "✅ Define sources table with id, documentId, url, title, author, publicationDate, accessDate",
 *   "✅ Add content text field for extracted source content",
 *   "✅ Add embedding vector field (768 dimensions for Google text-embedding-004)",
 *   "✅ Add metadata JSONB field (sourceType: web|manual, isAvailable, extractedAt)",
 *   "✅ Set embedding to nullable (generated asynchronously by background job)",
 *   "✅ Add timestamps (createdAt)",
 *   "✅ Define foreign key to documents with cascade delete",
 *   "✅ Create vector similarity index using ivfflat for cosine similarity"
 * ]
 * @deps: ["documents-schema", "pgvector-migration"]
 * @skills: ["drizzle-orm", "postgresql", "pgvector", "typescript"]
 */

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
    title: text("title"),
    author: text("author"),
    publicationDate: timestamp("publication_date", { withTimezone: true }),
    accessDate: timestamp("access_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    content: text("content"), // Extracted text for RAG
    embedding: vector("embedding", { dimensions: 768 }), // Google text-embedding-004, nullable
    metadata: jsonb("metadata").$type<SourceMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Indexes for performance
    documentIdIdx: index("sources_document_id_idx").on(table.documentId),
    // Vector similarity index is created via SQL migration (0001_enable_pgvector.sql)
    // because Drizzle doesn't fully support pgvector index syntax yet
  }),
);

// Type inference
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
