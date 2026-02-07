/**
 * Firecrawl service for web search and scraping
 * https://www.firecrawl.dev/
 */

export interface SearchRequest {
  query: string;
  limit: number;
}

/**
 * Build a Firecrawl search request payload
 */
export function buildSearchRequest(query: string): SearchRequest {
  return {
    query,
    limit: 5,
  };
}
