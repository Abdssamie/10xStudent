import { pgTable, text, uuid, timestamp, unique, foreignKey } from 'drizzle-orm/pg-core'
import { students } from './student'
import { aiProviderEnum } from './enums'

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id').notNull(),
    provider: aiProviderEnum('provider').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    iv: text('iv').notNull(),
    authTag: text('auth_tag').notNull(),
    keyMask: text('key_mask').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    studentFk: foreignKey({
      columns: [table.studentId],
      foreignColumns: [students.id],
      name: 'api_keys_student_id_fk',
    }).onDelete('cascade'),
    studentProviderUnique: unique('api_keys_student_provider_unique').on(
      table.studentId,
      table.provider
    ),
  })
)

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
