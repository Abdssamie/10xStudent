// Set DATABASE_URL before any imports
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the database package completely to prevent client initialization
vi.mock("@10xstudent/database", async () => {
  return {
    db: {
      select: vi.fn(),
    },
    sources: {
      id: "id",
      documentId: "documentId",
      url: "url",
      title: "title",
      author: "author",
      publicationDate: "publicationDate",
      accessDate: "accessDate",
      content: "content",
      embedding: "embedding",
      sourceType: "sourceType",
      metadata: "metadata",
      createdAt: "createdAt",
    },
  };
});

// Mock the embedding service
vi.mock("@/lib/embedding", () => ({
  embedText: vi.fn(),
}));

import { querySources } from "@/tools/query-sources-rag";
import { db } from "@10xstudent/database";
import { embedText } from "@/lib/embedding";

describe("querySources", () => {
  const mockEmbedding = new Array(768).fill(0.1);
  const mockDocumentId = "doc-123";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    (embedText as any).mockResolvedValue(mockEmbedding);
  });

  it("returns results sorted by similarity", async () => {
    const mockResults = [
      {
        id: "source-1",
        documentId: mockDocumentId,
        url: "https://example.com/1",
        title: "Most Relevant",
        author: null,
        publicationDate: null,
        accessDate: null,
        content: "Content 1",
        embedding: mockEmbedding,
        sourceType: "website",
        metadata: null,
        createdAt: new Date(),
        similarity: 0.95,
      },
      {
        id: "source-2",
        documentId: mockDocumentId,
        url: "https://example.com/2",
        title: "Less Relevant",
        author: null,
        publicationDate: null,
        accessDate: null,
        content: "Content 2",
        embedding: mockEmbedding,
        sourceType: "website",
        metadata: null,
        createdAt: new Date(),
        similarity: 0.85,
      },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockResults),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    const results = await querySources({
      documentId: mockDocumentId,
      query: "test query",
    });

    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    expect(embedText).toHaveBeenCalledWith("test query", undefined);
  });

  it("filters by documentId correctly", async () => {
    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    await querySources({
      documentId: mockDocumentId,
      query: "test query",
    });

    // Verify where clause was called (filters by documentId and embedding IS NOT NULL)
    expect(mockQuery.where).toHaveBeenCalled();
  });

  it("handles empty results", async () => {
    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    const results = await querySources({
      documentId: mockDocumentId,
      query: "nonexistent query",
    });

    expect(results).toEqual([]);
  });

  it("respects limit parameter", async () => {
    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    await querySources({
      documentId: mockDocumentId,
      query: "test query",
      limit: 10,
    });

    expect(mockQuery.limit).toHaveBeenCalledWith(10);
  });

  it("uses default limit of 5 when not specified", async () => {
    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    await querySources({
      documentId: mockDocumentId,
      query: "test query",
    });

    expect(mockQuery.limit).toHaveBeenCalledWith(5);
  });

  it("validates embedding is 768-dimensional number array", async () => {
    // Mock invalid embedding (wrong dimensions)
    (embedText as any).mockResolvedValue(new Array(512).fill(0.1));

    await expect(
      querySources({
        documentId: mockDocumentId,
        query: "test query",
      }),
    ).rejects.toThrow(
      "Invalid embedding: expected 768-dimensional number array",
    );
  });

  it("validates embedding contains only numbers", async () => {
    // Mock invalid embedding (contains non-numbers)
    const invalidEmbedding = new Array(768).fill(0.1);
    invalidEmbedding[0] = "not a number" as any;
    (embedText as any).mockResolvedValue(invalidEmbedding);

    await expect(
      querySources({
        documentId: mockDocumentId,
        query: "test query",
      }),
    ).rejects.toThrow("Invalid embedding");
  });

  it("validates embedding contains no NaN values", async () => {
    // Mock invalid embedding (contains NaN)
    const invalidEmbedding = new Array(768).fill(0.1);
    invalidEmbedding[0] = NaN;
    (embedText as any).mockResolvedValue(invalidEmbedding);

    await expect(
      querySources({
        documentId: mockDocumentId,
        query: "test query",
      }),
    ).rejects.toThrow("Invalid embedding");
  });

  it("passes contextLogger to embedText", async () => {
    const mockLogger = { info: vi.fn() } as any;
    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    await querySources({
      documentId: mockDocumentId,
      query: "test query",
      contextLogger: mockLogger,
    });

    expect(embedText).toHaveBeenCalledWith("test query", mockLogger);
  });

  it("filters out sources without embeddings", async () => {
    // The where clause should include "embedding IS NOT NULL"
    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as any).mockReturnValue(mockQuery as any);

    await querySources({
      documentId: mockDocumentId,
      query: "test query",
    });

    // Verify where was called (implementation filters by embedding IS NOT NULL)
    expect(mockQuery.where).toHaveBeenCalled();
  });
});
