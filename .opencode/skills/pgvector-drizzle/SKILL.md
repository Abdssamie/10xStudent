---
name: pgvector-drizzle
description: Implement vector embeddings and similarity search using pgvector extension with Drizzle ORM. Use this skill when working with semantic search, RAG systems, or any feature requiring vector similarity in PostgreSQL. Covers schema definition, indexing strategies (HNSW/IVFFlat), similarity queries, and Google text-embedding-004 integration.
---

# pgvector with Drizzle ORM

## Overview

This skill provides comprehensive guidance for implementing vector similarity search in PostgreSQL using the pgvector extension with Drizzle ORM. It covers everything from schema definition to production-ready similarity queries.

**Use this skill when:**

- Implementing semantic search or RAG (Retrieval-Augmented Generation) systems
- Storing and querying vector embeddings in PostgreSQL
- Setting up pgvector indexes for performance optimization
- Integrating Google text-embedding-004 or other embedding models
- Building document similarity or recommendation features

## Quick Start

### 1. Enable pgvector Extension

```sql
-- Migration: 0001_enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Define Vector Column in Drizzle Schema

```typescript
import {
  pgTable,
  serial,
  text,
  vector,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }), // Google text-embedding-004
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // HNSW index for fast similarity search
    index("sources_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
  ],
);
```

### 3. Perform Similarity Search

```typescript
import { db } from "./db";
import { sources } from "./schema";
import { cosineDistance } from "drizzle-orm";

// Find 5 most similar sources
const queryEmbedding = [0.123, -0.456 /* ... 766 more values */];

const results = await db
  .select({
    id: sources.id,
    content: sources.content,
    distance: cosineDistance(sources.embedding, queryEmbedding),
  })
  .from(sources)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(5);
```

## Core Concepts

### Vector Column Definition

```typescript
// Fixed dimensions (recommended for production)
embedding: vector("embedding", { dimensions: 768 });

// Variable dimensions (advanced use cases)
embedding: vector("embedding"); // No fixed dimension
```

**Best Practice:** Always specify dimensions for production schemas to enable proper indexing.

### Distance Operators

| Operator | Function           | Use Case                            | Range   |
| -------- | ------------------ | ----------------------------------- | ------- |
| `<=>`    | `cosineDistance()` | Normalized embeddings (most common) | 0-2     |
| `<->`    | `l2Distance()`     | Euclidean distance                  | 0-∞     |
| `<#>`    | `innerProduct()`   | Dot product (pre-normalized)        | -∞ to ∞ |
| `<+>`    | `l1Distance()`     | Manhattan distance                  | 0-∞     |

**Spec 0 Recommendation:** Use `cosineDistance()` for Google text-embedding-004.

### Index Types

**HNSW (Recommended for Spec 0)**

- ✅ Best query performance
- ✅ Handles dynamic data well
- ✅ No training required
- ⚠️ Slower to build
- ⚠️ Higher memory usage

**IVFFlat**

- ✅ Fast to build
- ✅ Lower memory usage
- ⚠️ Requires ANALYZE after creation
- ⚠️ Needs periodic rebuilds
- ⚠️ Lower accuracy

## Common Patterns

### Pattern 1: RAG Document Storage

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function storeDocumentSource(documentId: number, content: string) {
  // Generate embedding
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { parts: [{ text: content }] },
    taskType: "RETRIEVAL_DOCUMENT",
  });

  // Store in database
  await db.insert(sources).values({
    documentId,
    content,
    embedding: result.embedding.values, // 768 dimensions
  });
}
```

### Pattern 2: Semantic Search

```typescript
export async function searchSimilarContent(
  query: string,
  options: { documentId?: number; limit?: number; threshold?: number } = {},
) {
  const { documentId, limit = 5, threshold = 0.7 } = options;

  // Generate query embedding
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { parts: [{ text: query }] },
    taskType: "RETRIEVAL_QUERY",
  });

  const queryEmbedding = result.embedding.values;

  // Search with filters
  return await db
    .select({
      id: sources.id,
      content: sources.content,
      distance: cosineDistance(sources.embedding, queryEmbedding),
    })
    .from(sources)
    .where(
      and(
        documentId ? eq(sources.documentId, documentId) : undefined,
        sql`${cosineDistance(sources.embedding, queryEmbedding)} < ${threshold}`,
      ),
    )
    .orderBy(cosineDistance(sources.embedding, queryEmbedding))
    .limit(limit);
}
```

### Pattern 3: Batch Embedding Generation

```typescript
export async function batchEmbedSources(
  items: Array<{ documentId: number; content: string }>,
) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  // Generate embeddings in parallel (with rate limiting)
  const batchSize = 10;
  const embeddings: number[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((item) =>
        model.embedContent({
          content: { parts: [{ text: item.content }] },
          taskType: "RETRIEVAL_DOCUMENT",
        }),
      ),
    );
    embeddings.push(...results.map((r) => r.embedding.values));
  }

  // Insert all at once
  await db.insert(sources).values(
    items.map((item, i) => ({
      documentId: item.documentId,
      content: item.content,
      embedding: embeddings[i],
    })),
  );
}
```

## Migration Workflow

### Step 1: Enable Extension

```sql
-- 0001_enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 2: Create Table

```sql
-- 0002_create_sources.sql
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Step 3: Add Index

```sql
-- 0003_add_vector_index.sql
CREATE INDEX sources_embedding_idx
ON sources
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Note:** For IVFFlat, add `ANALYZE sources;` after index creation.

## Performance Optimization

### Query Optimization

```typescript
// ✅ GOOD - Uses index
db.select()
  .from(sources)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(10);

// ❌ BAD - Full table scan
db.select()
  .from(sources)
  .where(sql`${cosineDistance(sources.embedding, queryEmbedding)} < 0.5`);

// ✅ GOOD - Combines WHERE with ORDER BY + LIMIT
db.select()
  .from(sources)
  .where(sql`${cosineDistance(sources.embedding, queryEmbedding)} < 0.5`)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(10);
```

### Index Tuning

```typescript
// Adjust HNSW search quality at query time
await db.execute(sql`SET hnsw.ef_search = 200`); // Higher = better recall, slower

// Adjust IVFFlat search quality
await db.execute(sql`SET ivfflat.probes = 20`); // Higher = better recall, slower
```

### Memory Configuration

```sql
-- For index building
SET maintenance_work_mem = '2GB';

-- Create index
CREATE INDEX sources_embedding_idx
ON sources
USING hnsw (embedding vector_cosine_ops);
```

## Troubleshooting

### Issue: Slow Queries

**Solution:**

1. Verify index is being used: `EXPLAIN ANALYZE SELECT ...`
2. Ensure query uses `ORDER BY` + `LIMIT`
3. Increase `hnsw.ef_search` or `ivfflat.probes`
4. Check index parameters (m, ef_construction, lists)

### Issue: Index Build Fails

**Solution:**

1. Increase `maintenance_work_mem`
2. Reduce index parameters (lower m, ef_construction)
3. Build index in batches for large datasets
4. Check available disk space

### Issue: Poor Recall

**Solution:**

1. Use HNSW instead of IVFFlat
2. Increase index parameters (higher m, ef_construction, lists)
3. Rebuild IVFFlat index periodically
4. Verify embeddings are normalized (for cosine distance)

## References

See the `references/` directory for detailed documentation:

- **`indexing-strategies.md`** - HNSW vs IVFFlat comparison, index parameters, migration patterns
- **`similarity-search.md`** - Distance functions, query patterns, RAG implementation
- **`schema-definition.md`** - Vector column types, TypeScript types, best practices
- **`google-embeddings.md`** - Google text-embedding-004 integration, task types, batch processing

## Related Skills

- **tanstack-ai** - For LLM integration and token tracking
- **drizzle-orm** - For general Drizzle ORM patterns (if available)

## Quick Reference

```typescript
// Schema
embedding: vector("embedding", { dimensions: 768 });

// Index (HNSW)
index("idx").using("hnsw", table.embedding.op("vector_cosine_ops"));

// Query
cosineDistance(table.embedding, queryEmbedding);

// Embedding
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
const result = await model.embedContent(text);
const embedding = result.embedding.values; // number[]
```
