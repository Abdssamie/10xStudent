import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@/database/schema";
import { DB } from "@/database";

/**
 * TestDatabaseService - Per-test-file database service
 * 
 * Each test file creates its own instance to:
 * - Maintain a single connection per test file (not per test)
 * - Ensure transaction visibility within the test file
 * - Provide test isolation via cleanDatabase() in beforeEach
 * - Enable proper dependency injection for services under test
 * 
 * Usage:
 * ```typescript
 * describe("My Tests", () => {
 *   let testDb: TestDatabaseService;
 *   
 *   beforeEach(async () => {
 *     testDb = new TestDatabaseService(process.env.DATABASE_URL!);
 *     await testDb.cleanDatabase();
 *     await testDb.seedTestUser(userId, 1000);
 *   });
 *   
 *   afterAll(async () => {
 *     await testDb.close();
 *   });
 * });
 * ```
 */
export class TestDatabaseService {
  private db: DB;
  private client: postgres.Sql;

  constructor(connectionString: string) {
    this.client = postgres(connectionString, {
      max: 10, // Limit connection pool size
      onnotice: () => {}, // Suppress PostgreSQL NOTICE messages (e.g., TRUNCATE CASCADE)
    });
    this.db = drizzle(this.client, { schema });
  }

  /**
   * Get database instance for dependency injection
   * Use this to inject into services like CreditManager, AgentService, etc.
   */
  getDb(): DB {
    return this.db;
  }

  /**
   * Clean all tables - ensures test isolation
   * Uses the same connection as all other operations
   */
  async cleanDatabase(): Promise<void> {
    // Disable foreign key checks temporarily
    await this.client`SET session_replication_role = 'replica'`;

    // Truncate all tables
    await this.client`TRUNCATE TABLE users CASCADE`;
    await this.client`TRUNCATE TABLE documents CASCADE`;
    await this.client`TRUNCATE TABLE sources CASCADE`;
    await this.client`TRUNCATE TABLE citations CASCADE`;
    await this.client`TRUNCATE TABLE credit_logs CASCADE`;
    await this.client`TRUNCATE TABLE assets CASCADE`;
    await this.client`TRUNCATE TABLE chat_messages CASCADE`;

    // Re-enable foreign key checks
    await this.client`SET session_replication_role = 'origin'`;
  }

  /**
   * Seed a test user with credits
   */
  async seedTestUser(
    userId: string,
    credits: number = 1000
  ): Promise<schema.User> {
    const [user] = await this.db
      .insert(schema.users)
      .values({
        id: userId,
        credits,
        creditsResetAt: new Date(),
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create test user");
    }

    return user;
  }

  /**
   * Get current credit balance for a user
   */
  async getUserCredits(userId: string): Promise<number> {
    const [user] = await this.db
      .select({ credits: schema.users.credits })
      .from(schema.users)
      .where(sql`${schema.users.id} = ${userId}`);

    return user?.credits ?? 0;
  }

  /**
   * Get all credit logs for a user
   */
  async getUserCreditLogs(userId: string): Promise<schema.CreditLog[]> {
    const logs = await this.db
      .select()
      .from(schema.creditLogs)
      .where(sql`${schema.creditLogs.userId} = ${userId}`);

    return logs;
  }

  /**
   * Seed a test document
   */
  async seedTestDocument(
    userId: string,
    title: string = "Test Document"
  ): Promise<schema.Document> {
    const [document] = await this.db
      .insert(schema.documents)
      .values({
        id: crypto.randomUUID(),
        userId,
        title,
        template: "ieee",
        citationFormat: "ieee",
        typstKey: `${userId}/test-doc.typ`,
      })
      .returning();

    if (!document) {
      throw new Error("Failed to create test document");
    }

    return document;
  }

  /**
   * Close database connection
   * Called during test teardown
   */
  async close(): Promise<void> {
    await this.client.end();
  }
}
