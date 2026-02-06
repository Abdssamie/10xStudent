# Google text-embedding-004 with pgvector

## Overview

Google's **text-embedding-004** model generates 768-dimensional embeddings optimized for semantic similarity search. This is the recommended embedding model for Spec 0.

**Official Documentation**: https://ai.google.dev/gemini-api/docs/embeddings

## Model Specifications

| Property                 | Value                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| **Model Name**           | `text-embedding-004`                                                                           |
| **Default Dimensions**   | 768                                                                                            |
| **Supported Dimensions** | 128, 256, 512, 768, 1536, 2048, 3072 (via `outputDimensionality`)                              |
| **Max Input Tokens**     | 2048 tokens                                                                                    |
| **Normalization**        | Required for dimensions < 3072                                                                 |
| **Task Types**           | `RETRIEVAL_QUERY`, `RETRIEVAL_DOCUMENT`, `SEMANTIC_SIMILARITY`, `CLASSIFICATION`, `CLUSTERING` |

## Basic Usage with Google AI SDK

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent(text);
  const embedding = result.embedding;

  return embedding.values; // 768-dimensional array
}

// Usage
const embedding = await generateEmbedding("Machine learning is fascinating");
console.log(embedding.length); // 768
```

## Task Types for RAG

Use different task types for indexing vs querying:

```typescript
// For indexing documents (sources)
async function generateDocumentEmbedding(text: string): Promise<number[]> {
  const model = gI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent({
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    title: "Document Title", // Optional but recommended
  });

  return result.embedding.values;
}

// For search queries
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent({
    content: { parts: [{ text: query }] },
    taskType: "RETRIEVAL_QUERY",
  });

  return result.embedding.values;
}
```

**Spec 0 Pattern:**

- Use `RETRIEVAL_DOCUMENT` when embedding source content for storage
- Use `RETRIEVAL_QUERY` when embedding user questions for similarity search

## Dimension Reduction

Reduce dimensions to save storage (requires normalization):

```typescript
async function generateReducedEmbedding(
  text: string,
  dimensions: 256 | 512 | 768 | 1536 = 768,
): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimety: dimensions,
  });

  // Normalize for dimensions < 3072
  if (dimensions < 3072) {
    return normalizeL2(result.embedding.values);
  }

  return result.embedding.values;
}

function normalizeL2(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map((val) => val / magnitude);
}
```

**Spec 0 Recommendation:** Use default 768 dimensions (no reduction needed).

## Batch Embedding

Embed multiple texts efficiently:

```typescript
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map((text) => model.embedContent(text)),
    );

    embeddings.push(...results.map((r) => r.embedding.values));
  }

  return embeddings;
}
```

## Integration with Drizzle + pgvector

Complete pattern for Spec 0:

```typescimport { db } from './db';
import { sources } from './schema';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Embed and store source
export async function createSource(documentId: number, content: string) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const result = await model.embedContent({
    content: { parts: [{ text: content }] },
    taskType: 'RETRIEVAL_DOCUMENT',
  });

  const embedding = result.embedding.values; // 768 dimensions

  await db.insert(sources).values({
    documentId,
    content,
    embedding,
  });
}

// Search similar sources
export async function searchSimilarSources(query: string, limit = 5) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const result = await model.embedContent({
    content: { parts: [{ text: query }] },
    taskType: 'RETRIEVAL_QUERY',
  });

  const queryEmbedding = result.embedding.values;

  return await db
    .select({
      id: sources.id,
      content: sources.content,
      distance: cosineDistance(sources.embedding, queryEmbedding),
    })
    .from(sources)
    .orderBy(cosineDistance(sources.embedding, queryEmbedding))
    .limit(limit);
}
```

## Cost Considerations

**Pricing** (as of 2024):

- **Free tier**: 1,500 requests per day
- **Paid tier**: $0.00025 per 1,000 characters

**Spec 0 Credit Mapping:**

- Embedding generation is typically cheap compared to LLM inference
- Consider tracking embedding API calls separately from LLM token usage
- 1 credit ≈ 1,000 tokens (LLM) or ~10 embedding calls

## Performance Tips

1. **Cache embeddings**: Store in database, don't regenerate
2. **Batch processing**: Embed multiple texts together
3. **Use task types**: Improves retrieval accuracy
4. **Normalize when needed**: Required for reduced dimensions
5. **Monitor rate limits**: Free tier has daily limits

## MTEB Benchmark Scores

Performance by dimension (from official docs):

| Dimension | MTEB Score   |
| --------- | ------------ |
| 3072      | 68.16        |
| 1536      | 68.17        |
| **768**   | **67.99** ⭐ |
| 512       | 67.55        |
| 256       | 66.19        |
| 128       | 63.31        |

**Spec 0 Choice:** 768 dimensions offers excellent performance with reasonable storage.

## Error Handling

```typescript
async function generateEmbeddingWithRetry(
  text: string,
  maxRetries = 3,
): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }

  throw new Error("Failed to generate embedding after retries");
}
```

## Alternative: Vercel AI SDK

If using Vercel AI SDK (alternative to Google AI SDK):

```typescript
import { embed } from "ai";
import { google } from "@ai-sdk/google";

const { embedding } = await embed({
  model: google.textEmbeddingModel("text-embedding-004"),
  value: "Machine learning is fascinating",
});

console.log(embedding.length); // 768
```

**Spec 0 Recommendation:** Use `@google/generative-ai` for consistency with Gemini LLM integration.
