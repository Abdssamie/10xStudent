/**
 * Search and add sources tool
 * Handles the full pipeline: web search → fetch content → extract metadata → generate embeddings → save to database
 */

import { db, schema } from "@/database";
import { searchWeb, scrapeUrls } from "@/services/firecrawl";
import { generateEmbedding } from "@/lib/embeddings";
import { buildSourceInsert } from "./add-source";
import type { Logger } from "pino";

const { sources } = schema;

export interface SearchAndAddSourcesInput {
  query: string;
  documentId: string;
  maxResults?: number;
  contextLogger?: Logger;
}

export interface SearchAndAddSourcesOutput {
  sourceId: string;
  title: string;
  author?: string;
  snippet: string;
}


export async function searchAndAddSources(
  input: SearchAndAddSourcesInput,
): Promise<SearchAndAddSourcesOutput[]> {
  const { query, documentId, maxResults = 5, contextLogger } = input;

  const opLogger = contextLogger?.child({
    operation: "searchAndAddSources",
    query,
    documentId,
    maxResults,
  });

  opLogger?.info("Starting search and add sources pipeline");

  try {
    // Step 1: Search web for relevant sources
    opLogger?.info("Step 1: Searching web");
    const searchResults = await searchWeb(query, maxResults, opLogger);

    if (searchResults.length === 0) {
      opLogger?.warn("No search results found");
      return [];
    }

    opLogger?.info(
      { resultCount: searchResults.length },
      "Search completed, starting content extraction",
    );

    // Step 2: Scrape content from URLs (parallel with error handling)
    opLogger?.info("Step 2: Scraping content from URLs");
    const urls = searchResults.map((result) => result.url);
    const scrapedContent = await scrapeUrls(urls, opLogger);

    if (scrapedContent.length === 0) {
      opLogger?.warn("Failed to scrape any content");
      return [];
    }

    opLogger?.info(
      {
        scrapedCount: scrapedContent.length,
        failedCount: urls.length - scrapedContent.length,
      },
      "Content scraping completed",
    );

    // Step 3 & 4: Generate embeddings and save to database
    opLogger?.info("Step 3: Generating embeddings and saving to database");
    const addedSources: SearchAndAddSourcesOutput[] = [];

    for (const scraped of scrapedContent) {
      try {
        // Generate embedding for the content
        const embedding = await generateEmbedding(scraped.content, opLogger);

        // Parse publication date if available
        let publicationDate: Date | undefined;
        if (scraped.publishedDate) {
          try {
            publicationDate = new Date(scraped.publishedDate);
            // Validate date
            if (isNaN(publicationDate.getTime())) {
              publicationDate = undefined;
            }
          } catch {
            publicationDate = undefined;
          }
        }

        // Build source insert object with automatic type detection
        const sourceInsert = buildSourceInsert({
          documentId,
          url: scraped.url,
          title: scraped.title,
          content: scraped.content,
          embedding,
          author: scraped.author,
          publicationDate,
        });

        // Insert into database
        const [insertedSource] = await db
          .insert(sources)
          .values(sourceInsert)
          .returning({
            id: sources.id,
            title: sources.title,
            author: sources.author,
            content: sources.content,
          });

        if (!insertedSource) {
          opLogger?.error(
            { url: scraped.url },
            "Failed to insert source - no result returned",
          );
          continue;
        }

        // Create snippet (first 200 chars)
        const snippet =
          scraped.content.length > 200
            ? scraped.content.slice(0, 200) + "..."
            : scraped.content;

        addedSources.push({
          sourceId: insertedSource.id,
          title: insertedSource.title || "Untitled",
          author: insertedSource.author || undefined,
          snippet,
        });

        opLogger?.info(
          {
            sourceId: insertedSource.id,
            url: scraped.url,
            title: scraped.title,
          },
          "Source added successfully",
        );
      } catch (error) {
        // Log error but continue with other sources
        opLogger?.error(
          {
            url: scraped.url,
            error,
          },
          "Failed to add source",
        );
      }
    }

    opLogger?.info(
      {
        totalAdded: addedSources.length,
        totalAttempted: scrapedContent.length,
      },
      "Search and add sources pipeline completed",
    );

    return addedSources;
  } catch (error) {
    opLogger?.error({ error }, "Search and add sources pipeline failed");
    throw error;
  }
}
