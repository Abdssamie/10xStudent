/**
 * @id: pgvector-migration
 * @priority: high
 * @progress: 100
 * @directive: Create SQL migration to enable pgvector extension and create vector similarity index
 * @context: specs/01-database-api-foundation.md#pgvector-migration
 * @checklist: [
 *   "✅ Enable pgvector extension",
 *   "✅ Create vector similarity index using ivfflat for cosine similarity",
 *   "✅ Configure index parameters (lists = 100 for <1M vectors)",
 *   "✅ Add note about HNSW index for production with >1M vectors"
 * ]
 * @deps: []
 * @skills: ["postgresql", "pgvector", "sql"]
 */

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector similarity index for sources
-- Using ivfflat index for fast approximate nearest neighbor search
-- This index is optimized for <1M vectors
CREATE INDEX IF NOT EXISTS sources_embedding_idx
ON sources
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Note: For production with >1M vectors, consider using HNSW index instead:
-- CREATE INDEX sources_embedding_idx ON sources USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- After creating the index, run ANALYZE to update statistics
ANALYZE sources;
