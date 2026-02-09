/**
 * Embedding service for generating text embeddings using Google text-embedding-004 model.
 * Returns 768-dimensional vectors for semantic search with pgvector.
 *
 * Features:
 * - 768-dimensional embeddings for pgvector semantic search
 * - Automatic retry with exponential backoff for rate limits
 * - Structured logging with Pino
 * - Input validation and truncation
 * - Comprehensive error handling
 */

import pino from "pino";

// Initialize base logger for embedding service
const logger = pino({
  name: "embedding-service",
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const GOOGLE_EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Error thrown when embedding generation fails after all retries
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/**
 * Generate a 768-dimensional embedding vector for the given text.
 *
 * @param text - The text content to embed (max ~10,000 characters recommended)
 * @param contextLogger - Optional parent logger for context enrichment
 * @returns Promise resolving to a 768-dimensional number array
 * @throws {EmbeddingError} If embedding generation fails after retries
 *
 * @example
 * ```typescript
 * const embedding = await embedText("This is a sample document about AI.");
 * // Returns: [0.123, -0.456, 0.789, ...] (768 dimensions)
 *
 * // With context logger (from Hono middleware)
 * const embedding = await embedText(text, c.get('logger'));
 * ```
 */
export async function embedText(
  text: string,
  contextLogger?: pino.Logger,
): Promise<number[]> {
  // Use provided logger or create child logger for this operation
  const opLogger = (contextLogger || logger).child({
    operation: "embedText",
    service: "embedding",
  });
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new EmbeddingError(
      "GOOGLE_API_KEY environment variable is not set",
      500,
    );
  }

  // Validate input
  if (!text || text.trim().length === 0) {
    logger.warn("Attempted to embed empty text");
    throw new EmbeddingError("Text content cannot be empty", 400);
  }

  // Truncate text if too long (Google API has limits)
  const truncatedText = text.slice(0, 10000);
  const textLength = text.length;

  if (textLength > 10000) {
    logger.warn(
      { originalLength: textLength, truncatedLength: 10000 },
      "Text truncated for embedding",
    );
  }

  logger.debug(
    { textLength: truncatedText.length },
    "Starting embedding generation",
  );

  let lastError: unknown;

  // Retry logic for rate limits and transient failures
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `${GOOGLE_EMBEDDING_API_URL}?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: {
              parts: [{ text: truncatedText }],
            },
            taskType: "RETRIEVAL_DOCUMENT",
          }),
        },
      );

      // Handle non-200 responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Rate limit - retry with exponential backoff
        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            opLogger.warn(
              {
                event: "rate_limit",
                attempt,
                delay,
                statusCode: response.status,
              },
              "Rate limited, retrying after delay",
            );
            await sleep(delay);
            continue;
          }
        }

        // Other errors - throw immediately
        opLogger.error(
          {
            event: "api_error",
            statusCode: response.status,
            error: errorData,
          },
          "Google Embedding API error",
        );
        throw new EmbeddingError(
          `Google Embedding API error: ${errorData.error?.message || errorData.message || "Unknown error"}`,
          response.status,
          errorData,
        );
      }

      // Parse successful response
      const data = (await response.json()) as any;

      // Validate response structure to ensure it contains the expected embedding values
      if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
        opLogger.error(
          { event: "invalid_response", response: data },
          "Invalid response format from Google Embedding API",
        );
        throw new EmbeddingError(
          "Invalid response format from Google Embedding API",
          500,
          data,
        );
      }

      const embedding = data.embedding.values;

      // Validate embedding dimensions (should be 768 for text-embedding-004)
      if (embedding.length !== 768) {
        opLogger.error(
          {
            event: "invalid_dimensions",
            dimensions: embedding.length,
            expected: 768,
          },
          "Invalid embedding dimensions",
        );
        throw new EmbeddingError(
          `Expected 768 dimensions, got ${embedding.length}`,
          500,
          data,
        );
      }

      // Success - return embedding
      opLogger.info(
        {
          event: "embedding_generated",
          attempt,
          dimensions: embedding.length,
          textLength: truncatedText.length,
        },
        "Successfully generated embedding",
      );
      return embedding;
    } catch (error) {
      lastError = error;

      // If it's already an EmbeddingError, rethrow immediately (don't retry)
      if (error instanceof EmbeddingError) {
        throw error;
      }

      // Network errors - retry
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        opLogger.warn(
          {
            event: "network_error",
            attempt,
            delay,
            error: lastError,
          },
          "Network error, retrying",
        );
        await sleep(delay);
        continue;
      }
    }
  }

  // All retries exhausted
  opLogger.error(
    {
      event: "embedding_failed",
      attempts: MAX_RETRIES,
      lastError,
    },
    "Failed to generate embedding after all retries",
  );
  throw new EmbeddingError(
    `Failed to generate embedding after ${MAX_RETRIES} attempts`,
    500,
    lastError,
  );
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch embed multiple texts (useful for bulk operations)
 *
 * @param texts - Array of text strings to embed
 * @param contextLogger - Optional parent logger for context enrichment
 * @returns Promise resolving to array of embeddings
 *
 * @example
 * ```typescript
 * const embeddings = await embedTextBatch([
 *   "First document",
 *   "Second document",
 *   "Third document"
 * ]);
 * ```
 */
export async function embedTextBatch(
  texts: string[],
  contextLogger?: pino.Logger,
): Promise<number[][]> {
  const batchLogger = (contextLogger || logger).child({
    operation: "embedTextBatch",
    batchSize: texts.length,
  });

  batchLogger.info({ batchSize: texts.length }, "Starting batch embedding");

  // Process sequentially to avoid rate limits
  // TODO: Implement parallel processing with rate limiting
  const embeddings: number[][] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await embedText(texts[i]!, batchLogger);
      embeddings.push(embedding);
      successCount++;
    } catch (error) {
      batchLogger.error({ index: i, error }, "Failed to embed text in batch");
      failureCount++;
      throw error; // Fail fast on first error
    }
  }

  batchLogger.info(
    {
      event: "batch_complete",
      total: texts.length,
      successCount,
      failureCount,
    },
    "Batch embedding completed",
  );

  return embeddings;
}
