import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { documents } from "./documents";

// Tool call structure for AI tool execution
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Chat messages for AI-assisted writing
// Each row represents a single message in a conversation
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "tool"] }).notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls").$type<ToolCall[]>(), // For AI assistant tool calls
    toolCallId: text("tool_call_id"), // For tool role messages - links to the tool call they're responding to
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_document_id_idx").on(table.documentId),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
