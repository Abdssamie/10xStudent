import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const searchAndAddSourcesDef = toolDefinition({
  name: "searchAndAddSources",
  description:
    "Search the web for relevant academic sources and automatically add them to the document. " + 
    "Use this when you need to find and add new sources to support research or arguments.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Search query to find relevant academic sources"),
    documentId: z
      .uuid()
      .describe("UUID of the document to add sources to"),
    maxResults: z
      .number()
      .default(5)
      .describe("Maximum number of sources to find and add (default: 5)"),
  }),
  outputSchema: z.array(
    z.object({
      sourceId: z.uuid().describe("UUID of the added source"),
      title: z.string().describe("Title of the source"),
      author: z
        .string()
        .optional()
        .describe("Author of the source (if available)"),
      snippet: z.string().describe("Short excerpt from the source for context"),
    }),
  ),
});
