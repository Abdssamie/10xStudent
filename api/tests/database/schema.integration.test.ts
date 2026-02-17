import { describe, it, expect, beforeAll } from "vitest";
import postgres from "postgres";
import { getTestDbService } from "../helpers/get-test-db-service";

describe("Database Schema Integration Tests", () => {
  let client: ReturnType<typeof postgres>;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }
    client = postgres(process.env.DATABASE_URL);
  });

  describe("pgvector extension", () => {
    it("should have pgvector extension installed", async () => {
      const result = await client`
        SELECT * FROM pg_extension WHERE extname = 'vector'
      `;
      
      expect(result).toHaveLength(1);
      expect(result[0]?.extname).toBe("vector");
    });

    it("should support vector operations", async () => {
      // Test that we can create and query vector columns
      const result = await client`
        SELECT '[1,2,3]'::vector AS test_vector
      `;
      
      expect(result).toHaveLength(1);
      expect(result[0]?.test_vector).toBeDefined();
    });
  });

  describe("Table schemas", () => {
    it("should have users table with correct columns", async () => {
      const result = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;

      const columns = result.map(r => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === "YES",
      }));

      expect(columns).toContainEqual({ name: "id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "credits", type: "integer", nullable: false });
      expect(columns).toContainEqual({ name: "credits_reset_at", type: "timestamp without time zone", nullable: false });
    });

    it("should have documents table with correct columns", async () => {
      const result = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'documents'
        ORDER BY ordinal_position
      `;

      const columns = result.map(r => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === "YES",
      }));

      expect(columns).toContainEqual({ name: "id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "user_id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "title", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "template", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "citation_format", type: "text", nullable: false });
    });

    it("should have sources table with vector column", async () => {
      const result = await client`
        SELECT column_name, udt_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sources'
        ORDER BY ordinal_position
      `;

      const columns = result.map(r => ({
        name: r.column_name,
        type: r.udt_name,
        nullable: r.is_nullable === "YES",
      }));

      expect(columns).toContainEqual({ name: "id", type: "text", nullable: false });
   expect(columns).toContainEqual({ name: "document_id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "embedding", type: "vector", nullable: true });
    });

    it("should have credit_logs table with correct columns", async () => {
      const result = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'credit_logs'
        ORDER BY ordinal_position
      `;

      const columns = result.map(r => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === "YES",
      }));

      expect(columns).toContainEqual({ name: "id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "user_id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "operation", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "cost", type: "integer", nullable: false });
      expect(columns).toContainEqual({ name: "tokens_used", type: "integer", nullable: true });
    });

    it("should have chat_messages table with correct columns", async () => {
      const result = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'chat_messages'
        ORDER BY ordinal_position
      `;

      const columns = result.map(r => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === "YES",
      }));

      expect(columns).toContainEqual({ name: "id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "document_id", type: "text", nullable: false });
      expect(columns).toContainEqual({ name: "role", type: "text", nullable: false });
      es).toContainEqual({ name: "content", type: "text", nullable: false });
    });
  });

  describe("Foreign key constraints", () => {
    it("should have foreign key from documents to users", async () => {
      const result = await client`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
   cu.constraint_name = tc.constrname
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'documents'
          AND kcu.column_name = 'user_id'
      `;

      expect(result).toHaveLength(1);
      expect(result[0]?.foreign_table_name).toBe("users");
      expect(result[0]?.foreign_column_name).toBe("id");
    });

    it("should have foreign key from sources to documents", async () => {
      const result = await client`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'sources'
          AND kcu.column_name = 'document_id'
      `;

      expect(result).toHaveLength(1);
      expect(result[0]?.foreign_table_name).documents");
      expect(result[0]?.foreign_column_name).toBe("id");
    });

    it("should have foreign key from credit_logs to users", async () => {
      const result = await client`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'credit_logs'
          AND kcu.column_name = 'user_id'
      `;

      expect(result).toHaveLength(1);
      expect(result[0]?.foreign_table_name).toBe("users");
      expect(result[0]?.foreign_column_name).toBe("id");
    });
  });

  describe("Indexes", () => {
    it("should have primary key indexes on all tables", async () => {
      const tables = ["users", "documents", "sources", "citations", "credit_logs", "assets", "chat_messages"];
      
      for (const table of tables) {
        const result = await client`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = ${table}
            AND indexname LIKE '%_pkey'
        `;
        
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it("should have index on documents.user_id for foreign key", async () => {
      const result = await client`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'documents'
          AND indexdef LIKE '%user_id%'
      `;
      
      expect(result.length).toBeGreaterThan(0);
    });

    it("should have index on sources.document_id for foreign key", async () => {
      const result = await client`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'sources'
          AND indexdef LIKE '%document_id%'
      `;
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Data integrity", () => {
    it("should enforce NOT NULL constraints", async () => {
      // Try to insert user without credits (should fail)
      await expect(async () => {
        await client`
          INSERT INTO users (id, credits_reset_at)
          VALUES ('test-user', NOW())
        `;
      }).rejects.toThrow();
    });

    it("should enforce foreignstraints", async () => {
      // Try to insert document with non-existent user (should fail)
      await expect(async () => {
        await client`
          INSERT INTO documents (id, user_id, title, template, citation_format, typst_key)
          VALUES ('test-doc', 'non-existent-user', 'Test', 'ieee', 'ieee', 'key')
        `;
      }).rejects.toThrow();
    });

    it("should cascade delete from users to documents", async () => {
      // Insert user and document
      await client`
        INSERT INTO users (id, credits, credits_reset_at)
        VALUES ('cascade-test-user', 100, NOW())
      `;
      
      await client`
        INSERT INTO documents (id, user_id, title, template, citation_format, typst_key)
        VALUES ('cascade-test-doc', 'cascade-test-user', 'Test', 'ieee', 'ieee', 'key')
      `;

      // Delete user
      await client`DELETE FROM users WHERE id = 'cascade-test-user'`;

      // Check document was also deleted
      const result = await client`
        SELECT * FROM documents WHERE id = 'cascade-test-doc'
      `;
      
      expect(result).toHaveLength(0);
    });
  });
});
