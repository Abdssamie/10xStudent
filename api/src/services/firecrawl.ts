/**
 * Firecrawl service for web search and scraping
 * https://www.firecrawl.dev/
 */

import pino from "pino";
import { env } from "@/config/env";
import { AppError } from "@/errors";

// Initialize logger for Firecrawl service
const logger = pino({
  name: "firecrawl-service",
  level: process.env.LOG_LEVEL || "info",
});

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

export interface SearchRequest {
  query: string;
  limit: number;
}

export interface SearchResult {
  url: string;
  title: string;
  description: string;
}

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedDate?: string;
}

interface FirecrawlResponse {
  success: boolean;
  data: {
    markdown?: string;
    content?: string;
    metadata?: {
      title?: string;
      description?: string;
      author?: string;
      publishedTime?: string;
    };
    [key: string]: unknown;
  } | {
    // Search results format
    url: string;
    title?: string;
    description?: string;
    [key: string]: unknown;
  }[];
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

/**
 * Search the web using Firecrawl API
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of search results with URLs and metadata
 */
export async function searchWeb(
  query: string,
  limit: number = 5,
  contextLogger?: pino.Logger,
): Promise<SearchResult[]> {
  const opLogger = (contextLogger || logger).child({
    operation: "searchWeb",
    query,
    limit,
  });

  if (!env.FIRECRAWL_API_KEY) {
    opLogger.warn("FIRECRAWL_API_KEY not configured, returning empty results");
    return [];
  }

  try {
    opLogger.info("Starting web search");

    const response = await fetch(`${FIRECRAWL_API_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        limit,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      opLogger.error(
        {
          statusCode: response.status,
          error: errorText,
        },
        "Firecrawl search API error",
      );
      throw new AppError(
        `Firecrawl search failed: ${response.status}`,
        502,
        "EXTERNAL_API_ERROR",
        { service: "firecrawl", statusCode: response.status, error: errorText }
      );
    }

    const data = (await response.json()) as unknown as FirecrawlResponse;

    if (!data.success || !Array.isArray(data.data)) {
      opLogger.warn({ data }, "Unexpected search response format");
      return [];
    }

    // Firecrawl returns results in data.data array
    const results: SearchResult[] = data.data.map((item) => {
      const searchItem = item as {
        url: string;
        title?: string;
        description?: string;
      };
      return {
        url: searchItem.url || "",
        title: searchItem.title || "Untitled",
        description: searchItem.description || "",
      };
    });

    opLogger.info(
      { resultCount: results.length },
      "Web search completed successfully",
    );

    return results;
  } catch (error) {
    opLogger.error({ error }, "Failed to search web");
    throw error;
  }
}

/**
 * Scrape content from a URL using Firecrawl API
 *
 * @param url - URL to scrape
 * @returns Scraped content with metadata
 */
export async function scrapeUrl(
  url: string,
  contextLogger?: pino.Logger,
): Promise<ScrapeResult> {
  const opLogger = (contextLogger || logger).child({
    operation: "scrapeUrl",
    url,
  });

  if (!env.FIRECRAWL_API_KEY) {
    throw new AppError(
      "FIRECRAWL_API_KEY not configured",
      500,
      "CONFIGURATION_ERROR"
    );
  }

  try {
    opLogger.info("Starting URL scrape");

    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      opLogger.error(
        {
          statusCode: response.status,
          error: errorText,
        },
        "Firecrawl scrape API error",
      );
      throw new AppError(
        `Firecrawl scrape failed: ${response.status}`,
        502,
        "EXTERNAL_API_ERROR",
        { service: "firecrawl", statusCode: response.status, error: errorText }
      );
    }

    const data = (await response.json()) as unknown as FirecrawlResponse;

    if (!data.success || Array.isArray(data.data)) {
      throw new AppError(
        "Invalid scrape response format",
        502,
        "EXTERNAL_API_ERROR",
        { service: "firecrawl" }
      );
    }

    const metadata = data.data.metadata || {};

    // Extract content and metadata from Firecrawl response
    const result: ScrapeResult = {
      url,
      title: metadata.title || (data.data.title as string) || "Untitled",
      content: data.data.markdown || data.data.content || "",
      author: metadata.author,
      publishedDate: metadata.publishedTime,
    };

    opLogger.info(
      {
        contentLength: result.content.length,
        hasAuthor: !!result.author,
        hasPublishedDate: !!result.publishedDate,
      },
      "URL scrape completed successfully",
    );

    return result;
  } catch (error) {
    opLogger.error({ error }, "Failed to scrape URL");
    throw error;
  }
}

/**
 * Scrape multiple URLs in parallel with error handling
 * Returns partial results if some URLs fail
 *
 * @param urls - Array of URLs to scrape
 * @returns Array of successful scrape results
 */
export async function scrapeUrls(
  urls: string[],
  contextLogger?: pino.Logger,
): Promise<ScrapeResult[]> {
  const batchLogger = (contextLogger || logger).child({
    operation: "scrapeUrls",
    urlCount: urls.length,
  });

  batchLogger.info("Starting batch URL scrape");

  // Filter out any undefined URLs
  const validUrls = urls.filter((url): url is string => !!url);

  const results = await Promise.allSettled(
    validUrls.map((url) => scrapeUrl(url, batchLogger)),
  );

  const successful: ScrapeResult[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      const failedUrl = validUrls[index];
      if (failedUrl) {
        failed.push(failedUrl);
        batchLogger.warn(
          {
            url: failedUrl,
            error: result.reason,
          },
          "Failed to scrape URL",
        );
      }
    }
  });

  batchLogger.info(
    {
      total: urls.length,
      successful: successful.length,
      failed: failed.length,
    },
    "Batch URL scrape completed",
  );

  return successful;
}
