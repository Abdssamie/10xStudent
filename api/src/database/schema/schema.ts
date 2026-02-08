import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * @id: database-schema
 * @priority: high
 * @progress: 20
 * @directive: Placeholder schema file - individual table schemas should be defined in separate files
 * @context: specs/00-system-architecture-integration.md#database-schema
 * @deps: ["users-schema", "documents-schema", "sources-schema", "citations-schema", "credit-logs-schema"]
 * @spec: Core database schema matching the system architecture spec.
 * According to spec, the architecture is:
 * - users (with credits system)
 * - documents (with typstContent, citationCounter, template)
 * - sources (with pgvector embeddings for RAG)
 * - citations (tracking which sources are cited)
 * - credit_logs (audit trail)
 *
 * NOTE: This file is a placeholder. Individual schemas should be implemented in:
 * - packages/database/src/schema/users.ts
 * - packages/database/src/schema/documents.ts
 * - packages/database/src/schema/sources.ts
 * - packages/database/src/schema/citations.ts
 * - packages/database/src/schema/credit-logs.ts
 * - packages/database/src/schema/index.ts (exports all)
 * @skills: ["drizzle-orm", "postgresql"]
 */

// Placeholder - schemas should be defined in separate files per the spec
// This file exists to maintain compatibility during migration
