import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create postgres connection
const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString, { max: 10 })

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

export type Database = typeof db
