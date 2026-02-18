import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const querySourcesRAGDef = toolDefinition({
  name: "querySourcesRAG",
  description:
    "Semantically search sources already added to the document. Returns most relevant sources with similarity scores.",
  inputSchema: z.object({
    documentId: z
      .uuid()
      .describe("UUID of the document to search sources in"),
    query: z.string().describe("Search query for semantic similarity matching"),
    limit: z
      .number()
      .default(5)
      .describe("Number of top results to return (default: 5)"),
  }),
  outputSchema: z.array(
    z.object({
      sourceId: z.uuid().describe("UUID of the source"),
      title: z.string().describe("Title of the source"),
      excerpt: z
        .string()
        .describe("Content excerpt from the source (first 500 characters)"),
      similarity: z
        .number()
        .describe("Cosine similarity score (0-1, higher is more similar)"),
    }),
  ),
});
