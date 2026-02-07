import { describe, it, expect } from "vitest";
import { generateBibTeX } from "../../src/citations.js";
import type { SourceType } from "../../src/sources/source-type.js";

interface SourceWithKey {
  id: string;
  title: string;
  author: string;
  url: string;
  publicationDate: string;
  citationKey: string;
  sourceType: SourceType;
}

describe("generateBibTeX", () => {
  it("uses @article for journal sources", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "Title",
        author: "Ada Lovelace",
        url: "https://example.com",
        publicationDate: "2023-01-01",
        citationKey: "lovelace2023",
        sourceType: "journal",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@article{lovelace2023");
  });

  it("uses @book for book sources", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "Computing Machinery",
        author: "Alan Turing",
        url: "https://example.com/paper",
        publicationDate: "1950-01-01",
        citationKey: "turing1950",
        sourceType: "book",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@book{turing1950");
    expect(bib).toContain("title = {Computing Machinery}");
    expect(bib).toContain("author = {Alan Turing}");
    expect(bib).toContain("year = {1950}");
  });

  it("uses @misc for website sources", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "Web Article",
        author: "John Doe",
        url: "https://example.com",
        publicationDate: "2023-01-01",
        citationKey: "doe2023",
        sourceType: "website",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@misc{doe2023");
  });

  it("uses @phdthesis for thesis sources", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "PhD Thesis",
        author: "Jane Smith",
        url: "https://example.com/thesis",
        publicationDate: "2022-01-01",
        citationKey: "smith2022",
        sourceType: "thesis",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@phdthesis{smith2022");
  });

  it("handles multiple sources with different types", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "First Paper",
        author: "Ada Lovelace",
        url: "https://example.com/1",
        publicationDate: "2023-01-01",
        citationKey: "lovelace2023",
        sourceType: "journal",
      },
      {
        id: "2",
        title: "Second Paper",
        author: "Alan Turing",
        url: "https://example.com/2",
        publicationDate: "1950-01-01",
        citationKey: "turing1950",
        sourceType: "book",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@article{lovelace2023");
    expect(bib).toContain("@book{turing1950");
  });
});
