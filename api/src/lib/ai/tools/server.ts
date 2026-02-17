import { searchAndAddSourcesDef, querySourcesRAGDef } from "./schemas";
import { searchAndAddSources } from "@/lib/ai/tools/search-and-add-sources";
import { querySources } from "@/lib/ai/tools/query-sources-rag";

// Server tools with execution logic
export const searchAndAddSourcesTool = searchAndAddSourcesDef.server(searchAndAddSources);
export const querySourcesRAGTool = querySourcesRAGDef.server(querySources);

// Export all tools as a list for the chat adapter
export const serverTools = [
  searchAndAddSourcesTool,
  querySourcesRAGTool,
];
