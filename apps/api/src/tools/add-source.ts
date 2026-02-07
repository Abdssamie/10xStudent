/**
 * Add source tool for AI chat
 * Handles source ingestion with metadata extraction and embedding generation
 */

import { detectSourceType, type SourceType } from "@10xstudent/domain";

export interface SourceInsertInput {
  documentId: string;
  url: string;
  title: string;
  content: string;
  embedding: number[];
  sourceType?: SourceType;
  author?: string;
  publicationDate?: Date;
}

export interface SourceInsert {
  documentId: string;
  url: string;
  title: string;
  content: string;
  embedding: number[];
  sourceType: SourceType;
  author?: string;
  publicationDate?: Date;
}

/**
 * Build a source insert object with automatic type detection
 */
export function buildSourceInsert(input: SourceInsertInput): SourceInsert {
  return {
    documentId: input.documentId,
    url: input.url,
    title: input.title,
    content: input.content,
    embedding: input.embedding,
    sourceType: input.sourceType ?? detectSourceType(input.url),
    author: input.author,
    publicationDate: input.publicationDate,
  };
}
