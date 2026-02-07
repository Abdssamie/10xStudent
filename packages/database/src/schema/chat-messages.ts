import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { documents } from "./documents";

// Chat messages for AI-assisted writing
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system'
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"), // For AI tool execution tracking
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    documentIdIdx: index("chat_messages_document_id_idx").on(table.documentId),
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
  }),
);

// Type inference
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
