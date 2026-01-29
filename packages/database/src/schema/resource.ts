import { pgTable, text, uuid, timestamp, integer, foreignKey, index } from 'drizzle-orm/pg-core'
import { students } from './student'

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id').notNull(),
    filename: text('filename').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    studentFk: foreignKey({
      columns: [table.studentId],
      foreignColumns: [students.id],
      name: 'resources_student_id_fk',
    }).onDelete('cascade'),
    studentIdx: index('resources_student_idx').on(table.studentId),
  })
)

export type Resource = typeof resources.$inferSelect
export type NewResource = typeof resources.$inferInsert
