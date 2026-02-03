import { defineConfig } from 'drizzle-kit';

/**
 * @id: drizzle-config
 * @priority: high
 * @progress: 100
 * @spec: Configuration for Drizzle Kit. Should point to 'src/schema/schema.ts' and use process.env.DATABASE_URL.
 * @skills: ["drizzle-orm"]
 */

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
}

export default defineConfig({
    schema: './src/schema/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    verbose: true,
    strict: true,
});

