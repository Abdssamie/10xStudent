import { searchAndAddSourcesDef, querySourcesRAGDef } from "./schemas";
import { searchAndAddSources } from "./search-and-add-sources";
import { querySources } from "./query-sources-rag";
import type { SearchAndAddSourcesInput, SearchAndAddSourcesOutput } from "./search-and-add-sources";
import type { QuerySourcesInput, SourceResult } from "./query-sources-rag";

// Server tools with execution logic
export const searchAndAddSourcesTool = searchAndAddSourcesDef.server(searchAndAddSources as (input: SearchAndAddSourcesInput) => Promise<SearchAndAddSourcesOutput[]>);
export const querySourcesRAGTool = querySourcesRAGDef.server(querySources as (input: QuerySourcesInput) => Promise<SourceResult[]>);

// Export all tools as a list for the chat adapter
export const serverTools = [
  searchAndAddSourcesTool,
  querySourcesRAGTool,
];
