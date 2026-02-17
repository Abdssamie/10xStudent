import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/database/schema";

let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

/**
 * Global setup - runs once before all tests
 * Starts PostgreSQL (with pgvector) and Redis containers
 */
export async function setup(): Promise<void> {
  console.log("🚀 Starting TestContainers...");

  try {
    // Start PostgreSQL container with pgvector extension
    console.log("  📦 Starting PostgreSQL (pgvector) container...");
    postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg16")
      .withDatabase("test_10xstudent")
      .withUsername("test_postgres")
      .withPassword("test_secure_password")
      .withExposedPorts(5432)
      .start();

    const dbUrl = postgresContainer.getConnectionUri();
    console.log(`  ✅ PostgreSQL started: ${dbUrl}`);

    // Start Redis container
    console.log("  📦 Starting Redis container...");
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withCommand(["redis-server", "--appendonly", "yes"])
      .start();

    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);
    const redisUrl = `redis://${redisHost}:${redisPort}`;
    console.log(`  ✅ Redis started: ${redisUrl}`);

    // Set environment variables for tests
    process.env.DATABASE_URL = dbUrl;
    process.env.REDIS_URL = redisUrl;

    // Push database schema (faster than migrations for tests)
    console.log("  📝 Pushing database schema...");
    const client = postgres(dbUrl);

    // Enable pgvector extension
    await client`CREATE EXTENSION IF NOT EXISTS vector`;

    // Manually create tables using Drizzle schema
    const db = drizzle(client, { schema });
    
    // Import schema definitions
    const { users, documents, sources, citations, creditLogs, assets, chatMessages } = schema;

    // Create tables manually
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY NOT NULL,
        credits integer DEFAULT 10000 NOT NULL,
        preferences jsonb,
        credits_reset_at timestamp with time zone DEFAULT now() NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL,
        title text NOT NULL,
        typst_key text NOT NULL,
        bib_key text,
        template text NOT NULL,
        citation_format text DEFAULT 'APA' NOT NULL,
        citation_count integer DEFAULT 0 NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        document_id uuid NOT NULL,
        url text NOT NULL,
        citation_key text,
        title text,
        author text,
        publication_date timestamp with time zone,
        access_date timestamp with time zone DEFAULT now() NOT NULL,
        content text,
        embedding vector(1024),
        source_type text DEFAULT 'website' NOT NULL,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS citations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        document_id uuid NOT NULL,
        source_id uuid NOT NULL,
        citation_number integer NOT NULL,
        position integer NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS credit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL,
        operation text NOT NULL,
        cost integer NOT NULL,
        tokens_used integer,
        timestamp timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        document_id uuid NOT NULL,
        r2_key text NOT NULL,
        filename text NOT NULL,
        content_type text NOT NULL,
        size integer NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        document_id uuid NOT NULL,
        messages jsonb,
        content text NOT NULL,
        tool_calls jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `;

    await client.end();
    console.log("  ✅ Schema created successfully");

    console.log("✅ TestContainers ready!");
  } catch (error) {
    console.error("❌ Failed to start TestContainers:", error);
    throw error;
  }
}

/**
 * Global teardown - runs once after all tests
 * Stops and removes containers
 */
export async function teardown(): Promise<void> {
  console.log("🧹 Cleaning up TestContainers...");

  try {
    if (postgresContainer) {
      await postgresContainer.stop();
      console.log("  ✅ PostgreSQL container stopped");
    }

    if (redisContainer) {
      await redisContainer.stop();
      console.log("  ✅ Redis container stopped");
    }

    console.log("✅ TestContainers cleaned up!");
  } catch (error) {
    console.error("❌ Failed to stop TestContainers:", error);
    throw error;
  }
}
