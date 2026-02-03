import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/schema';

/**
 * @id: database-client
 * @priority: high
 * @progress: 95
 * @spec: Exports the initialized Drizzle client (`db`). Should handle connection pooling.
 * @skills: ["drizzle-orm"]
 */

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}

const connectionString = process.env.DATABASE_URL;

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
export type DB = typeof db;

