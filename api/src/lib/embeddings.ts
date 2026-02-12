/**
 * Embedding service using Voyage AI's voyage-4-lite model.
 * Returns 1024-dimensional vectors for semantic search with pgvector.
 *
 * Features:
 * - 1024-dimensional embeddings for pgvector semantic search
 * - Automatic retry with exponential backoff (built into SDK)
 * - Structured logging with Pino
 * - Input validation and truncation (32k token context)
 * - Separate functions for documents vs queries (improves retrieval quality)
 */

import { VoyageAIClient } from "voyageai";
import pino from "pino";
import { env } from "@/config/env";

const logger = pino({
  name: "voyage-embeddings",
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export class VoyageEmbeddingError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "VoyageEmbeddingError";
  }
}

let voyageClient: VoyageAIClient | null = null;

function getVoyageClient(): VoyageAIClient {
  if (!env.VOYAGEAI_API_KEY) {
    throw new VoyageEmbeddingError("VOYAGEAI_API_KEY is not configured", 500);
  }

  if (!voyageClient) {
    voyageClient = new VoyageAIClient({ apiKey: env.VOYAGEAI_API_KEY });
  }

  return voyageClient;
}

/**
 * Generate a 1024-dimensional embedding vector for document content.
 * Use this when storing documents for retrieval.
 *
 * @param text - The text content to embed (max ~32,000 tokens)
 * @param contextLogger - Optional parent logger for context enrichment
 * @returns Promise resolving to a 1024-dimensional number array
 * @throws {VoyageEmbeddingError} If embedding generation fails
 *
 * @example
 * ```typescript
 * const embedding = await generateEmbedding("This is a document about AI.");
 * // Returns: [0.123, -0.456, 0.789, ...] (1024 dimensions)
 * ```
 */
export async function generateEmbedding(
  text: string,
  contextLogger?: pino.Logger,
): Promise<number[]> {
  const opLogger = (contextLogger || logger).child({
    operation: "generateEmbedding",
    service: "voyage-embeddings",
  });

  if (!text || text.trim().length === 0) {
    throw new VoyageEmbeddingError("Text content cannot be empty", 400);
  }

  // Truncate text if too long (Voyage supports 32k tokens)
  const truncatedText = text.slice(0, 32000);
  if (text.length > 32000) {
    opLogger.warn(
      { originalLength: text.length, truncatedLength: 32000 },
      "Text truncated for embedding",
    );
  }

  try {
    const client = getVoyageClient();

    const response = await client.embed({
      input: truncatedText,
      model: "voyage-4-lite",
      inputType: "document",
      outputDimension: 1024,
    });

    if (!response.data || response.data.length === 0) {
      throw new VoyageEmbeddingError("No embedding returned from API", 500);
    }

    const embedding = response.data[0]?.embedding;

    if (!embedding || embedding.length !== 1024) {
      throw new VoyageEmbeddingError(
        `Expected 1024 dimensions, got ${embedding?.length ?? 0}`,
        500,
      );
    }

    opLogger.info(
      {
        event: "embedding_generated",
        dimensions: embedding.length,
        textLength: truncatedText.length,
      },
      "Successfully generated embedding",
    );

    return embedding;
  } catch (error) {
    opLogger.error(
      { event: "embedding_failed", error },
      "Failed to generate embedding",
    );

    if (error instanceof VoyageEmbeddingError) {
      throw error;
    }

    throw new VoyageEmbeddingError(
      "Failed to generate embedding",
      500,
      error,
    );
  }
}

/**
 * Generate embeddings for multiple documents in batch.
 * Maximum batch size is 1000 texts.
 *
 * @param texts - Array of text strings to embed
 * @param contextLogger - Optional parent logger for context enrichment
 * @returns Promise resolving to array of embeddings
 *
 * @example
 * ```typescript
 * const embeddings = await generateEmbeddingBatch([
 *   "First document",
 *   "Second document",
 *   "Third document"
 * ]);
 * ```
 */
export async function generateEmbeddingBatch(
  texts: string[],
  contextLogger?: pino.Logger,
): Promise<number[][]> {
  const batchLogger = (contextLogger || logger).child({
    operation: "generateEmbeddingBatch",
    batchSize: texts.length,
  });

  batchLogger.info({ batchSize: texts.length }, "Starting batch embedding");

  // Voyage AI supports up to 1000 texts per batch
  if (texts.length > 1000) {
    throw new VoyageEmbeddingError(
      "Batch size exceeds maximum of 1000 texts",
      400,
    );
  }

  try {
    const client = getVoyageClient();

    const truncatedTexts = texts.map((text) => {
      const truncated = text.slice(0, 32000);
      if (text.length > 32000) {
        batchLogger.warn(
          { originalLength: text.length, truncatedLength: 32000 },
          "Text truncated in batch",
        );
      }
      return truncated;
    });

    const response = await client.embed({
      input: truncatedTexts,
      model: "voyage-4-lite",
      inputType: "document",
      outputDimension: 1024,
    });

    if (!response.data || response.data.length === 0) {
      throw new VoyageEmbeddingError("No embeddings returned from API", 500);
    }

    const embeddings = response.data
      .map((item) => item.embedding)
      .filter((emb): emb is number[] => emb !== undefined);

    batchLogger.info(
      {
        event: "batch_complete",
        total: texts.length,
        successCount: embeddings.length,
      },
      "Batch embedding completed",
    );

    return embeddings;
  } catch (error) {
    batchLogger.error({ error }, "Failed to generate batch embeddings");
    throw new VoyageEmbeddingError(
      "Failed to generate batch embeddings",
      500,
      error,
    );
  }
}

/**
 * Generate embedding for search query (optimized for retrieval).
 * Use this when searching for relevant documents.
 *
 * This uses inputType="query" which prepends a prompt to optimize
 * the embedding for retrieval, improving search quality by 5-15%.
 *
 * @param query - The search query text
 * @param contextLogger - Optional parent logger for context enrichment
 * @returns Promise resolving to a 1024-dimensional number array
 * @throws {VoyageEmbeddingError} If embedding generation fails
 *
 * @example
 * ```typescript
 * const queryEmbedding = await generateQueryEmbedding("machine learning papers");
 * // Use this embedding for similarity search
 * ```
 */
export async function generateQueryEmbedding(
  query: string,
  contextLogger?: pino.Logger,
): Promise<number[]> {
  const opLogger = (contextLogger || logger).child({
    operation: "generateQueryEmbedding",
    service: "voyage-embeddings",
  });

  if (!query || query.trim().length === 0) {
    throw new VoyageEmbeddingError("Query cannot be empty", 400);
  }

  try {
    const client = getVoyageClient();

    const response = await client.embed({
      input: query,
      model: "voyage-4-lite",
      inputType: "query", // Optimized for search queries
      outputDimension: 1024,
    });

    if (!response.data || response.data.length === 0) {
      throw new VoyageEmbeddingError("No embedding returned from API", 500);
    }

    const embedding = response.data[0]?.embedding;

    if (!embedding || embedding.length !== 1024) {
      throw new VoyageEmbeddingError(
        `Expected 1024 dimensions, got ${embedding?.length ?? 0}`,
        500,
      );
    }

    opLogger.info(
      { event: "query_embedding_generated", queryLength: query.length },
      "Generated query embedding",
    );

    return embedding;
  } catch (error) {
    opLogger.error({ error }, "Failed to generate query embedding");

    if (error instanceof VoyageEmbeddingError) {
      throw error;
    }

    throw new VoyageEmbeddingError(
      "Failed to generate query embedding",
      500,
      error,
    );
  }
}
