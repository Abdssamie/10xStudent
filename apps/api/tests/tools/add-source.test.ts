import { describe, it, expect } from "vitest";
import { buildSourceInsert } from "../../src/tools/add-source.js";

describe("buildSourceInsert", () => {
  it("includes embedding and source type", () => {
    const insert = buildSourceInsert({
      documentId: "doc-123",
      url: "https://arxiv.org/abs/123",
      title: "Paper",
      content: "content",
      embedding: new Array(768).fill(0.1),
    });

    expect(insert.sourceType).toBe("journal");
    expect(insert.documentId).toBe("doc-123");
    expect(insert.url).toBe("https://arxiv.org/abs/123");
    expect(insert.title).toBe("Paper");
    expect(insert.content).toBe("content");
    expect(insert.embedding).toHaveLength(768);
  });

  it("detects source type from URL", () => {
    const insert = buildSourceInsert({
      documentId: "doc-123",
      url: "https://example.com/thesis/paper.pdf",
      title: "Thesis",
      content: "content",
      embedding: new Array(768).fill(0.1),
    });

    expect(insert.sourceType).toBe("thesis");
  });

  it("allows manual source type override", () => {
    const insert = buildSourceInsert({
      documentId: "doc-123",
      url: "https://example.com/article",
      title: "Article",
      content: "content",
      embedding: new Array(768).fill(0.1),
      sourceType: "book",
    });

    expect(insert.sourceType).toBe("book");
  });
});
