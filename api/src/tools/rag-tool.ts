import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { querySources } from "./query-sources-rag";

export const querySourcesTool = toolDefinition({
    name: "querySourcesRAG",
    description: "Query existing sources in the document using RAG (Retrieval-Augmented Generation). Use this to find relevant information to answer the user's question.",
    inputSchema: z.object({
        query: z.string().describe("The search query to find relevant sources"),
        documentId: z.string().describe("The UUID of the document to search within"),
        limit: z.number().optional().describe("Number of results to return (default: 5)"),
    }),
}).server(async ({ query, documentId, limit }) => {
    try {
        return await querySources({ query, documentId, limit });
    } catch (error) {
        console.error("Error in querySourcesRAG tool:", error);
        throw error;
    }
});
