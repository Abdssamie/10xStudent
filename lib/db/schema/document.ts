import { pgTable, text, uuid, timestamp, integer, foreignKey, index } from 'drizzle-orm/pg-core'
import { students } from './student'
import { documentTypeEnum, documentStatusEnum } from './enums'

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id').notNull(),
    title: text('title').notNull(),
    type: documentTypeEnum('type').notNull(),
    status: documentStatusEnum('status').notNull().default('DRAFT'),
    content: text('content').notNull(),
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentFk: foreignKey({
      columns: [table.studentId],
      foreignColumns: [students.id],
      name: 'documents_student_id_fk',
    }).onDelete('cascade'),
    studentUpdatedIdx: index('documents_student_updated_idx').on(table.studentId, table.updatedAt),
  })
)

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
