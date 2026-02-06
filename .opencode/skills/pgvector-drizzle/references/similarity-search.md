# Similarity Search with pgvector and Drizzle

## Distance Functions

Drizzle provides helper functions for vector similarity:

```typescript
import {
  l2Distance, // Euclidean distance
  cosineDistance, // Cosine distance (most common)
  innerProduct, // Dot product
  l1Distance, // Manhattan distance
} from "drizzle-orm";
```

## Basic Similarity Search

### Find Nearest Neighbors

```typescript
import { db } from "./db";
import { sources } from "./schema";
import { cosineDistance } from "drizzle-orm";

// Query embedding (from user question)
const queryEmbedding = [0.123, -0.456, 0.789 /* ... 765 more */];

// Find 5 most similar sources
const results = await db
  .select({
    id: sources.id,
    content: sources.content,
    distance: cosineDistance(sources.embedding, queryEmbedding),
  })
  .from(sources)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(5);

// Results sorted by similarity (lower distance = more similar)
console.log(results);
// [
//   { id: 42, content: '...', distance: 0.123 },
//   { id: 17, content: '...', distance: 0.234 },
//   ...
// ]
```

### With Distance Threshold

```typescript
import { sql } from "drizzle-orm";

// Only return results within distance threshold
const results = await db
  .select({
    id: sources.id,
    content: sources.content,
    distance: cosineDistance(sources.embedding, queryEmbedding),
  })
  .from(sources)
  .where(sql`${cosineDistance(sources.embedding, queryEmbedding)} < 0.5`)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(10);
```

**Note:** Combine `WHERE` with `ORDER BY` and `LIMIT` to use indexes efficiently.

## Distance Operators

### Cosine Distance (Recommended)

Best for normalized embeddings (like Google text-embedding-004):

```typescript
import { cosineDistance } from "drizzle-orm";

const results = await db
  .select()
  .from(sources)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(5);

// SQL: ORDER BY embedding <=> '[...]'
```

**Range:** 0 (identical) to 2 (opposite)

### L2 Distance (Euclidean)

For non-normalized vectors:

```typescript
import { l2Distance } from "drizzle-orm";

const results = await db
  .select()
  .from(sources)
  .orderBy(l2Distance(sources.embedding, queryEmbedding))
  .limit(5);

// SQL: ORDER BY embedding <-> '[...]'
```

**Range:** 0 (identical) to ∞

### Inner Product (Dot Product)

For pre-normalized vectors (returns negative value):

```typescript
import { innerProduct, sql } from "drizzle-orm";

const results = await db
  .select({
    id: sources.id,
    similarity: sql`(${innerProduct(sources.embedding, queryEmbedding)}) * -1`,
  })
  .from(sources)
  .orderBy(innerProduct(sources.embedding, queryEmbedding))
  .limit(5);

// SQL: ORDER BY embedding <#> '[...]'
```

**Note:** Multiply by -1 to get positive similarity score.

## Advanced Queries

### Filter by Metadata + Similarity

```typescript
import { eq, and } from "drizzle-orm";

// Find similar sources within a specific document
const results = await db
  .select({
    id: sources.id,
    content: sources.content,
    distance: cosineDistance(sources.embedding, queryEmbedding),
  })
  .from(sources)
  .where(eq(sources.documentId, 123))
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(5);
```

### Subquery for Dynamic Embedding

```typescript
import { eq } from "drizzle-orm";

// Find sources similar to a specific source
const referenceSource = db
  .select({ embedding: sources.embedding })
  .from(sources)
  .where(eq(sources.id, 42));

const results = await db
  .select()
  .from(sources)
  .orderBy(cosineDistance(sources.embedding, referenceSource))
  .limit(5);

// SQL: ORDER BY embedding <=> (SELECT embedding FROM sources WHERE id = 42)
```

### Hybrid Search (Keyword + Vector)

````typescript
import { ilike, or, sql } from 'drizzle-orm';

// Combine full-text search with vector similarity
const keyword = 'machine learning';
const results = await db
  .select({
    id: sources.id,
    content: sources.content,
    distance: cosineDistance(sources.embedding, queryEmbedding),
    keywordMatch: sql<boolean>`${sources.content} ILIKE ${`%${keyword}%`}`,
  })
  .from(sources)
  .where(
    or(
      ilike(sources.content, `%${keyword}%`),
      sql`${cosineDistance(sources.embedding, queryEmbedding)} < 0.5`
    )
  )
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .ln```

### Aggregate Vector Operations

```typescript
// Average embedding across sources
const avgEmbedding = await db
  .select({
    avgEmbedding: sql<number[]>`AVG(${sources.embedding})`,
  })
  .from(sources)
  .where(eq(sources.documentId, 123));

// Group by document and average embeddings
const docEmbeddings = await db
  .select({
    documentId: sources.documentId,
    avgEmbedding: sql<number[]>`AVG(${sources.embedding})`,
  })
  .from(sources)
  .groupBy(sources.documentId);
````

## RAG Query Pattern (Spec 0)

Complete pattern for Retrieval-Augmented Generation:

```typescript
import { db } from "./db";
import { sources } from "./schema";
import { cosineDistance, eq, and, isNotNull } from "drizzle-orm";

interface RAGQueryOptions {
  documentId?: number;
  limit?: number;
  distanceThreshold?: number;
}

export async function retrieveRelevantSources(
  queryEmbedding: number[],
  options: RAGQueryOptions = {},
) {
  const { documentId, limit = 5, distanceThreshold = 0.7 } = options;

  let query = db
    .select({
      id: sources.id,
      content: sources.content,
      distance: cosineDistance(sources.embedding, queryEmbedding),
    })
    .from(sources)
    .where(
      and(
        isNotNull(sources.embedding),
        documentId ? eq(sources.documentId, documentId) : undefined,
        sql`${cosineDistance(sources.embedding, queryEmbedding)} < ${distanceThreshold}`,
      ),
    )
    .orderBy(cosineDistance(sources.embedding, queryEmbedding))
    .limit(limit);

  return await query;
}

// Usage
const relevantSources = await retrieveRelevantSources(queryEmbedding, {
  documentId: 123,
  limit: 5,
  distanceThreshold: 0.6,
});
```

## Performance Tips

### 1. Always Use ORDER BY + LIMIT

Indexes only work with proper query structure:

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
```

### 2. Combine WHERE with ORDER BY

```typescript
// ✅ GOOD - Uses index efficiently
db.select()
  .from(sources)
  .where(sql`${cosineDistance(sources.embedding, queryEmbedding)} < 0.5`)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(10);
```

### 3. Filter Before Vector Search

```typescript
// ✅ GOOD - Filter first, then vector search
db.select()
  .from.where(eq(sources.documentId, 123))
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(5);
```

### 4. Tune Query Parameters

```typescript
// For IVFFlat - increase probes for better recall
await db.execute(sql`SET ivfflat.probes = 20`);

// For HNSW - increase ef_search for better recall
await db.execute(sql`SET hnsw.ef_search = 200`);
```

## Similarity to Cosine Similarity

Convert distance to similarity score (0-1 range):

```typescript
const results = await db
  .select({
    id: sources.id,
    content: sources.content,
    distance: cosineDistance(sources.embding, queryEmbedding),
    similarity: sql<number>`1 - ${cosineDistance(sources.embedding, queryEmbedding)}`,
  })
  .from(sources)
  .orderBy(cosineDistance(sources.embedding, queryEmbedding))
  .limit(5);

// similarity: 1.0 = identical, 0.0 = orthogonal, -1.0 = opposite
```
