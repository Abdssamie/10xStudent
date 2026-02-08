// Set DATABASE_URL before any imports
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database package
vi.mock("@/database", () => ({
  db: {
    insert: vi.fn(),
  },
  schema: {
    sources: {
      id: "id",
      title: "title",
      author: "author",
      content: "content",
    },
  },
}));

// Mock the external services
vi.mock("@/services/firecrawl", () => ({
  searchWeb: vi.fn(),
  scrapeUrls: vi.fn(),
}));

vi.mock("@/lib/embedding", () => ({
  embedText: vi.fn(),
}));

vi.mock("@/tools/add-source", () => ({
  buildSourceInsert: vi.fn((input) => ({
    documentId: input.documentId,
    url: input.url,
    title: input.title,
    content: input.content,
    embedding: input.embedding,
    sourceType: "website",
    author: input.author,
    publicationDate: input.publicationDate,
  })),
}));

import { searchAndAddSources } from "@/tools/search-and-add-sources";
import * as firecrawlService from "@/services/firecrawl";
import * as embeddingService from "@/lib/embedding";
import { db } from "@/database";

describe("searchAndAddSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock for db.insert
    const mockReturning = vi.fn();
    const mockValues = vi.fn().mockReturnValue({
      returning: mockReturning,
    });
    (db.insert as any).mockReturnValue({
      values: mockValues,
    });
    
    // Default: return inserted source
    mockReturning.mockResolvedValue([
      {
        id: "source-id-1",
        title: "Test Article",
        author: "Test Author",
        content: "Test content",
      },
    ]);
  });

  it("performs full pipeline", async () => {
    (firecrawlService.searchWeb as any).mockResolvedValue([
      {
        url: "https://example.com/article1",
        title: "Test Article 1",
        description: "Description 1",
      },
    ]);

    (firecrawlService.scrapeUrls as any).mockResolvedValue([
      {
        url: "https://example.com/article1",
        title: "Test Article 1",
        content: "This is the full content of article 1 with lots of text.",
        author: "John Doe",
      },
    ]);

    (embeddingService.embedText as any).mockResolvedValue(
      new Array(768).fill(0.1)
    );

    const mockReturning = vi.fn().mockResolvedValue([
      {
        id: "source-id-1",
        title: "Test Article 1",
        author: "John Doe",
        content: "This is the full content of article 1 with lots of text.",
      },
    ]);
    const mockValues = vi.fn().mockReturnValue({
      returning: mockReturning,
    });
    (db.insert as any).mockReturnValue({
      values: mockValues,
    });

    const result = await searchAndAddSources({
      query: "machine learning",
      documentId: "test-doc-id",
      maxResults: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Test Article 1",
      author: "John Doe",
    });
  });

  it("returns empty array when no search results found", async () => {
    (firecrawlService.searchWeb as any).mockResolvedValue([]);

    const result = await searchAndAddSources({
      query: "nonexistent topic",
      documentId: "test-doc-id",
    });

    expect(result).toEqual([]);
  });
});
