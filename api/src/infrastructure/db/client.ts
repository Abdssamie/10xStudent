import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import {env} from '@/config/env';

if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}

const connectionString = env.DATABASE_URL;

// Disable prefetch as it is not supported for "Transaction" pool mode
export const db = drizzle(connectionString, { schema });
export type DB = typeof db;

