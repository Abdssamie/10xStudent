# pgvector Schema Definition with Drizzle ORM

## Vector Column Type

Define vector columns using the `vector()` function from `drizzle-orm/pg-core`:

```typescript
import { pgTable, serial, text, vector, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }), // Google text-embedding-004
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Dimension Guidelines

**Common embedding dimensions:**

- **Google text-embedding-004**: 768 dimensions (default)
- **Google text-embedding-004 (reduced)**: 256, 512, 1536 dimensions (via `outputDimensionality`)
- **OpenAI text-embedding-3-small**: 1536 dimensions
- **OpenAI text-embedding-3-large**: 3072 dimensions

**Spec 0 Requirement:** Use 768 dimensions for Google text-embedding-004.

## Variable Dimensions (Advanced)

For tables storing embeddings from multiple models:

```typescript
export const embeddings = pgTable(
  "embeddings",
  {
    modelId: integer("model_id").notNull(),
    itemId: integer("item_id").notNull(),
    embedding: vector("embedding"), // No fixed dimension
  },
  (table) => ({
    pk: primaryKey({ columns: [table.modelId, table.itemId] }),
  }),
);
```

**Note:** Indexes require fixed dimensions. Use expression and partial indexing:

```typescript
// Index only 768-dimension embeddings for model_id = 1
index("embedding_768_idx")
  .using("hnsw", table.embedding.op("vector_cosine_ops"))
  .where(sql`model_id = 1 AND array_length(embedding, 1) = 768`);
```

## Multiple Vector Columns

Store different embedding types in the same table:

```typescript
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  content: text("content").notNull(),

  // Dense embedding for semantic search
  embedding: vector("embedding", { dimensions: 768 }),

  // Sparse embedding for keyword matching (if using sparse vectors)
  sparseEmbedding: vector("sparse_embedding", { dimensions: 768 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## TypeScript Types

Drizzle automatically infers types:

```typescript
type Document = typeof documents.$inferSelect;
// {
//   id: number;
//   content: string;
//   embedding: number[] | null;
//   createdAt: Date;
// }

type NewDocument = typeof documents.$inferInsert;
// {
//   id?: number;
//   content: string;
//   embedding?: number[] | null;
//   createdAt?: Date;
// }
```

## Inserting Vectors

```typescript
import { db } from "./db";
import { documents } from "./schema";

// Insert with embedding
await db.insert(documents).values({
  content: "Machine learning is a subset of artificial intelligence.",
  embedding: [0.123, -0.456, 0.789 /* ... 765 more values */],
});

// Insert without embedding (will be null)
await db.insert(documents).values({
  content: "Pending embedding generation.",
  embedding: null,
});
```

## Schema Best Practices

1. **Always specify dimensions** for production schemas (enables proper indexing)
2. **Use NOT NULL** only if embeddings are always generated synchronously
3. **Add timestamps** for tracking when embeddings were generated
4. **Consider metadata columns** for embedding model version tracking:

```typescript
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  embeddingModel: text("embedding_model").default("text-embedding-004"),
  embeddingGeneratedAt: timestamp("embedding_generated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
