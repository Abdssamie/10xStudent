/**
 * RAG query tool for semantic search over sources
 * Uses pgvector for cosine similarity search
 */

import { db } from "@10xstudent/database";
import { sources, type Source } from "@10xstudent/database";
import { sql } from "drizzle-orm";
import { embedText } from "@/lib/embedding.js";
import type { Logger } from "pino";

export interface QuerySourcesInput {
  documentId: string;
  query: string;
  limit?: number;
  contextLogger?: Logger;
}

export interface SourceResult extends Source {
  similarity: number;
}

/**
 * Query sources using semantic search with pgvector
 *
 * @param input - Query parameters including documentId, query text, and optional limit
 * @returns Array of sources sorted by relevance (cosine similarity)
 */
export async function querySources(
  input: QuerySourcesInput,
): Promise<SourceResult[]> {
  const { documentId, query, limit = 5, contextLogger } = input;

  // Generate embedding for the query
  const queryEmbedding = await embedText(query, contextLogger);

  // Validate embedding is a 768-dimensional number array to prevent SQL injection
  if (
    !Array.isArray(queryEmbedding) ||
    queryEmbedding.length !== 768 ||
    !queryEmbedding.every((val) => typeof val === "number" && !isNaN(val))
  ) {
    throw new Error(
      `Invalid embedding: expected 768-dimensional number array, got ${queryEmbedding?.length || 0} dimensions`,
    );
  }

  // Query database using pgvector cosine similarity
  // The <=> operator computes cosine distance (lower is more similar)
  const results = await db
    .select({
      id: sources.id,
      documentId: sources.documentId,
      url: sources.url,
      title: sources.title,
      author: sources.author,
      publicationDate: sources.publicationDate,
      accessDate: sources.accessDate,
      content: sources.content,
      embedding: sources.embedding,
      sourceType: sources.sourceType,
      metadata: sources.metadata,
      createdAt: sources.createdAt,
      similarity: sql<number>`1 - (${sources.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(sources)
    .where(
      sql`${sources.documentId} = ${documentId} AND ${sources.embedding} IS NOT NULL`,
    )
    .orderBy(
      sql`${sources.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`,
    )
    .limit(limit);

  return results;
}
