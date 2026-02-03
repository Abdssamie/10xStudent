import { pgTable, text, timestamp, jsonb, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * @id: database-schema
 * @priority: high
 * @progress: 95
 * @spec: Drizzle ORM schema definitions.
 * Entities:
 * - User: id (clerkId), email, preferences (jsonb)
 * - Project: id, userId, name, config (jsonb)
 * - Document: id, projectId, content (text), structure (jsonb), status, themeId
 * - Asset: id, projectId, url, storagePath, mimeType, embedding (placeholder array)
 * - Session: id, userId, projectId, threadId (langchain), context (jsonb)
 * @skills: ["drizzle-orm", "postgresql"]
 */

// --- Users ---
export const users = pgTable('users', {
    id: text('id').primaryKey(), // Clerk ID
    email: text('email').notNull(),
    preferences: jsonb('preferences').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
    projects: many(projects),
    sessions: many(sessions),
}));

// --- Projects ---
export const projects = pgTable('projects', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    config: jsonb('config').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, {
        fields: [projects.userId],
        references: [users.id],
    }),
    documents: many(documents),
    assets: many(assets),
    sessions: many(sessions),
}));

// --- Documents ---
export const documents = pgTable('documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    themeId: text('theme_id').default('default').notNull(),
    // Raw Typst content (optional/cached)
    content: text('content'),
    // Structured Document (IR)
    structure: jsonb('structure').$type<{ blocks: any[] }>().default({ blocks: [] }),
    type: text('type', { enum: ['thesis', 'resume', 'report', 'general'] }).notNull().default('general'),
    status: text('status', { enum: ['draft', 'compiling', 'success', 'error'] }).notNull().default('draft'),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
    project: one(projects, {
        fields: [documents.projectId],
        references: [projects.id],
    }),
}));

// --- Assets ---
export const assets = pgTable('assets', {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    fileName: text('file_name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ one }) => ({
    project: one(projects, {
        fields: [assets.projectId],
        references: [projects.id],
    }),
}));

// --- Sessions (Agent) ---
export const sessions = pgTable('sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    // LangChain Thread ID for persistence
    threadId: text('thread_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
    project: one(projects, {
        fields: [sessions.projectId],
        references: [projects.id],
    }),
}));
