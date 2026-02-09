/**
 * Build a source insert object for database insertion.
 * Uses automatic source type detection from URL with optional manual override.
 */

import { detectSourceType } from "@/utils/source-detection";
import { type SourceType } from "@shared/src/source-type";

import type { NewSource } from "@/database/schema/sources";

export interface BuildSourceInsertInput {
    documentId: string;
    url: string;
    title?: string;
    content?: string;
    embedding?: number[];
    author?: string;
    publicationDate?: Date;
    sourceType?: SourceType; // Optional manual override
    citationKey?: string;
}

export function buildSourceInsert(input: BuildSourceInsertInput): NewSource {
    return {
        documentId: input.documentId,
        url: input.url,
        title: input.title,
        content: input.content,
        embedding: input.embedding,
        author: input.author,
        publicationDate: input.publicationDate,
        // Use manual override if provided, otherwise auto-detect from URL
        sourceType: input.sourceType ?? detectSourceType(input.url),
        citationKey: input.citationKey,
    };
}
