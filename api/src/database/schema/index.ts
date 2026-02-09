import { relations } from "drizzle-orm";

// Export all table schemas
export { users, type User, type NewUser, type UserPreferences } from "./users";
export { documents, type Document, type NewDocument } from "./documents";
export {
  sources,
  type Source,
  type NewSource,
  type SourceMetadata,
} from "./sources";
export { citations, type Citation, type NewCitation } from "./citations";
export { creditLogs, type CreditLog, type NewCreditLog } from "./credit-logs";
export { assets, type Asset, type NewAsset } from "./assets";
export { chatMessages, type ChatMessage, type NewChatMessage } from "./chat-messages";

// Import tables for relations
import { users } from "./users";
import { documents } from "./documents";
import { sources } from "./sources";
import { citations } from "./citations";
import { creditLogs } from "./credit-logs";
import { assets } from "./assets";
import { chatMessages } from "./chat-messages";

// Define relations for Drizzle relational queries
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  creditLogs: many(creditLogs),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  sources: many(sources),
  citations: many(citations),
  assets: many(assets),
  chatMessages: many(chatMessages),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  document: one(documents, {
    fields: [sources.documentId],
    references: [documents.id],
  }),
  citations: many(citations),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  document: one(documents, {
    fields: [citations.documentId],
    references: [documents.id],
  }),
  source: one(sources, {
    fields: [citations.sourceId],
    references: [sources.id],
  }),
}));

export const creditLogsRelations = relations(creditLogs, ({ one }) => ({
  user: one(users, {
    fields: [creditLogs.userId],
    references: [users.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  document: one(documents, {
    fields: [assets.documentId],
    references: [documents.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  document: one(documents, {
    fields: [chatMessages.documentId],
    references: [documents.id],
  }),
}));
