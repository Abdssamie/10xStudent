import { searchAndAddSourcesDef, querySourcesRAGDef } from "./schemas";
import { searchAndAddSources } from "./search-and-add-sources";
import { querySources } from "./query-sources-rag";

// Server tools with execution logic
export const searchAndAddSourcesTool = searchAndAddSourcesDef.server(searchAndAddSources as (args: unknown) => Promise<unknown>);
export const querySourcesRAGTool = querySourcesRAGDef.server(querySources as (args: unknown) => Promise<unknown>);

// Export all tools as a list for the chat adapter
export const serverTools = [
  searchAndAddSourcesTool,
  querySourcesRAGTool,
];
