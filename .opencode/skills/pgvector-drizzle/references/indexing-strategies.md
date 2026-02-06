# pgvector Indexing Strategies

## Index Types Overview

pgvector supports two approximate nearest neighbor (ANN) index types:

| Feature                 | IVFFlat                         | HNSW                                |
| ----------------------- | ------------------------------- | ----------------------------------- |
| **Algorithm**           | K-means clustering              | Hierarchical graph                  |
| **Build Speed**         | ⚡ Fast (seconds)               | 🐌 Slow (minutes)                   |
| **Query Speed**         | 🚀 Very fast (low probes)       | 🚀 Fast & consistent                |
| **Accuracy**            | ⚠️ Depends on clusters          | ✅ Generally higher                 |
| **Memory Usage**        | 💾 Lower                        | 💾 Higher                           |
| **Training Required**   | ✅ Yes (needs ANALYZE)          | ❌ No                               |
| **Incremental Updates** | ⚠️ Requires rebuild             | ✅ Handles well                     |
| **Best For**            | Static datasets, speed priority | Dynamic datasets, accuracy priority |

## HNSW Indexes (Recommended for Spec 0)

**Hierarchical Navigable Small Worlds** - Best for production RAG systems.

### Basic HNSW Index

```typescript
import { pgTable, serial, text, vector, index } from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => [
    // Cosine distance index (most common for embeddings)
    index("sources_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
```

### HNSW with Parameters

```typescript
export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => [
    index("sources_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
  ],
);
```

**Parameters:**

- **`m`** (default: 16): Max connections per layer
  - Higher = better recall, more memory
  - Range: 4-64, typical: 16
- **`ef_construction`** (default: 64): Size of dynamic candidate list during build
  - Higher = better index quality, slower build
  - Range: 4-1000, typical: 64

### Distance Operators

```typescript
// Cosine distance (normalized vectors, most common)
table.embedding.op("vector_cosine_ops");

// L2 distance (Euclidean)
table.embedding.op("vector_l2_ops");

// Inner product (dot product, for pre-normalized vectors)
table.embedding.op("vector_ip_ops");

// L1 distance (Manhattan, pgvector 0.7.0+)
table.embedding.op("vector_l1_ops");
```

**Spec 0 Recommendation:** Use `vector_cosine_ops` for Google text-embedding-004.

## IVFFlat Indexes

**Inverted File with Flat Compression** - Best for very large static datasets.

### Basic IVFFlat Index

```typescript
export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => [
    index("sources_embedding_ivf_idx")
      .using("ivfflat", table.embedding.op("vector_cosine_ops"))
      .with({ lists: 100 }),
  ],
);
```

### Choosing `lists` Parameter

**Formula:**

- **Up to 1M rows**: `rows / 1000`
- **Over 1M rows**: `sqrt(rows)`

**Examples:**

- 10,000 rows → `lists: 10`
- 100,000 rows → `lists: 100`
- 1,000,000 rows → `lists: 1000`
- 10,000,000 rows → `lists: 3162` (sqrt)

### IVFFlat Requires ANALYZE

```sql
-- After creating IVFFlat index, MUST run:
ANALYZE sources;
```

In migration:

```sql
-- Migration: 0002_add_vector_index.sql
CREATE INDEX sources_embedding_ivf_idx
ON sources
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

ANALYZE sources;
```

### Query-Time Parameters

```typescript
import { sql } from "drizzle-orm";

// Set probes for IVFFlat (number of clusters to search)
await db.execute(sql`SET ivfflat.probes = 10`);

// Set ef_search for HNSW (size of dynamic candidate list)
await db.execute(sql`SET hnsw.ef_search = 100`);
```

**Trade-off:** Higher values = better recall, slower queries.

## Migration Pattern

### Enable pgvector Extension

```sql
-- Migration: 0001_enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Create Table with Vector Column

```sql
-- Migration: 0002_create_sources.sql
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Add HNSW Index

```sql
-- Migration: 0003_add_hnsw_index.sql
CREATE INDEX sources_embedding_idx
ON sources
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Performance Considerations

### Memory Requirements

**IVFFlat:**

- Increase `maintenance_work_mem` during index build:
  ```sql
  SET maintenance_work_mem = '2GB';
  ```

**HNSW:**

- Requires more memory than IVFFlat
- pgvector 0.6.0+ supports parallel builds (faster)
- Monitor with:
  ```sql
  SELECT phase, tuples_done, tuples_total
  FROM pg_stat_progress_create_index;
  ```

### Index Build Times (Benchmark)

For 100,000 rows with 768 dimensions:

- **IVFFlat**: ~15 seconds
- **HNSW**: ~2 minutes

### When to Use Each

**Use HNSW when:**

- ✅ Data changes frequently (inserts/updates)
- ✅ Accuracy is critical (RAG systems)
- ✅ Consistent query performance needed
- ✅ You have sufficient memory

**Use IVFFlat when:**

- ✅ Dataset is mostly static
- ✅ Speed is more important than accuracy
- ✅ Memory is constrained
- ✅ You can rebuild indexes periodically

**Spec 0 Recommendation:** Use HNSW for dynamic document/source management.

## Multiple Indexes

You can create multiple indexes for different use cases:

```typescript
export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => [
    // HNSW for high-accuracy queries
    index("sources_embedding_hnsw_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),

    // IVFFlat for fast approximate queries
    index("sources_embedding_ivf_idx")
      .using("ivfflat", table.embedding.op("vector_cosine_ops"))
      .with({ lists: 100 }),
  ],
);
```

**Note:** Multiple indexes increase storage and write overhead.
