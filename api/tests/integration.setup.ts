import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/infrastructure/db/schema";

let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

/**
 * TODO: Improve TestContainers setup for better test isolation
 * 
 * Current issue: All test files share a single database, causing race conditions
 * when tests run in parallel. We've set fileParallelism: false as a workaround,
 * but this makes tests slower.
 * 
 * Better solutions to consider:
 * 1. Use database schemas per test file (CREATE SCHEMA test_file_1, etc.)
 * 2. Use separate database per test file (CREATE DATABASE test_file_1, etc.)
 * 3. Use transactions with ROLLBACK in afterEach (fastest, but complex with async operations)
 * 4. Use a connection pool with isolated transactions per test
 * 
 * References:
 * - https://node-postgres.com/features/transactions
 * - https://www.testcontainers.org/features/creating_container/#reusable-containers
 */

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
    const client = postgres(dbUrl, { max: 1 });

    // Enable pgvector extension
    await client`CREATE EXTENSION IF NOT EXISTS vector`;

    // Use drizzle migrate to apply migrations
    const db = drizzle(client, { schema });
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db, { migrationsFolder: "./.drizzle" });
    
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
