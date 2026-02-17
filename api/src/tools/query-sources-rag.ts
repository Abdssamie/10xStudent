/**
 * RAG query tool for semantic search over sources
 * Uses pgvector for cosine similarity search
 */

import { db } from "@/database";
import { sources, } from "@/database";
import { sql } from "drizzle-orm";
import { generateQueryEmbedding } from "@/lib/embeddings.js";
import type { Logger } from "pino";

export interface QuerySourcesInput {
  documentId: string;
  query: string;
  limit?: number;
  contextLogger?: Logger;
}

export interface SourceResult {
  sourceId: string;
  title: string;
  excerpt: string;
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
  const queryEmbedding = await generateQueryEmbedding(query, contextLogger);

  // Validate embedding is a 1024-dimensional number array to prevent SQL injection
  if (
    !Array.isArray(queryEmbedding) ||
    queryEmbedding.length !== 1024 ||
    !queryEmbedding.every((val) => typeof val === "number" && !isNaN(val))
  ) {
    throw new Error(
      `Invalid embedding: expected 1024-dimensional number array, got ${queryEmbedding?.length || 0} dimensions`,
    );
  }

  // Query database using pgvector cosine similarity
  // The <=> operator computes cosine distance (lower is more similar)
  const results = await db
    .select({
      id: sources.id,
      title: sources.title,
      content: sources.content,
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

  // Map results to token-efficient format with excerpts
  return results.map((result) => {
    const content = result.content as string | null;
    const title = result.title as string | null;
    const similarity = result.similarity as number;

    return {
      sourceId: result.id as string,
      title: title || "Untitled",
      excerpt:
        content && content.length > 500
          ? content.slice(0, 500) + "..."
          : content || "",
      similarity,
    };
  });
}
