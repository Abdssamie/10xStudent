import { describe, it, expect } from "vitest";
import { generateBibTeX } from "../../src/citations.js";

interface SourceWithKey {
  id: string;
  title: string;
  author: string;
  url: string;
  publicationDate: string;
  citationKey: string;
}

describe("generateBibTeX", () => {
  it("renders bib entries with citation keys", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "Title",
        author: "Ada Lovelace",
        url: "https://example.com",
        publicationDate: "2023-01-01",
        citationKey: "lovelace2023",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@article{lovelace2023");
  });

  it("generates BibTeX format entries", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "Computing Machinery",
        author: "Alan Turing",
        url: "https://example.com/paper",
        publicationDate: "1950-01-01",
        citationKey: "turing1950",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@article{turing1950");
    expect(bib).toContain("title = {Computing Machinery}");
    expect(bib).toContain("author = {Alan Turing}");
    expect(bib).toContain("year = {1950}");
  });

  it("handles multiple sources with unique keys", () => {
    const sources: SourceWithKey[] = [
      {
        id: "1",
        title: "First Paper",
        author: "Ada Lovelace",
        url: "https://example.com/1",
        publicationDate: "2023-01-01",
        citationKey: "lovelace2023",
      },
      {
        id: "2",
        title: "Second Paper",
        author: "Alan Turing",
        url: "https://example.com/2",
        publicationDate: "1950-01-01",
        citationKey: "turing1950",
      },
    ];

    const bib = generateBibTeX(sources);
    expect(bib).toContain("@article{lovelace2023");
    expect(bib).toContain("@article{turing1950");
  });
});
