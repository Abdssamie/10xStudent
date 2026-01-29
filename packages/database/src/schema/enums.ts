import { pgEnum } from 'drizzle-orm/pg-core'

export const documentTypeEnum = pgEnum('document_type', ['RESUME', 'GENERAL'])
export const documentStatusEnum = pgEnum('document_status', ['DRAFT', 'PUBLISHED'])
export const aiProviderEnum = pgEnum('ai_provider', ['OPENAI', 'GEMINI'])
