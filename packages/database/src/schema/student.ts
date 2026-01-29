import { pgTable, text, bigint, timestamp, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const students = pgTable(
  'students',
  {
    id: text('id').primaryKey(), // Clerk User ID
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    storageUsedBytes: bigint('storage_used_bytes', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('students_email_idx').on(table.email),
  })
)

// TypeScript type inference
export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert
