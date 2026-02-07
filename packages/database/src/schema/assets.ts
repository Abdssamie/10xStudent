import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { documents } from "./documents";

// Assets table for document images/files stored in R2
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(), // S3/R2 path to asset (images, files, etc.)
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(), // bytes
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    documentIdIdx: index("assets_document_id_idx").on(table.documentId),
  }),
);

// Type inference
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
