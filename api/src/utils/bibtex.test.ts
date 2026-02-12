import { describe, it, expect } from "vitest";
import { generateBibTex, mapSourceTypeToBibTex } from "./bibtex";
import { type Source } from "@/database/schema/sources";

function createMockSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "test-id",
    documentId: "doc-id",
    url: "https://example.com",
    citationKey: "test2023",
    title: "Test Title",
    author: "Test Author",
    publicationDate: new Date("2023-01-01"),
    accessDate: new Date("2024-01-01"),
    content: "Test content",
    embedding: null,
    sourceType: "website",
    metadata: {
        sourceType: "web",
        isAvailable: true
    },
    createdAt: new Date(),
    ...overrides,
  };
}

describe("mapSourceTypeToBibTex", () => {
    it("should map website to misc", () => {
        expect(mapSourceTypeToBibTex("website")).toBe("misc");
    });
    
    it("should map journal to article", () => {
        expect(mapSourceTypeToBibTex("journal")).toBe("article");
    });

    it("should map book to book", () => {
        expect(mapSourceTypeToBibTex("book")).toBe("book");
    });
    
    it("should default to misc for unknown types", () => {
        expect(mapSourceTypeToBibTex("unknown" as any)).toBe("misc");
    });
});

describe("generateBibTex", () => {
    it("should generate bibtex for a website", () => {
        const source = createMockSource({
            sourceType: "website",
            citationKey: "example2023",
            title: "Example Website",
            author: "John Doe",
            url: "https://example.com",
            publicationDate: new Date("2023-05-15")
        });
        
        const bibtex = generateBibTex(source);
        
        expect(bibtex).toContain("@misc{example2023,");
        expect(bibtex).toContain('title = {Example Website}');
        expect(bibtex).toContain('author = {John Doe}');
        expect(bibtex).toContain('howpublished = {\\url{https://example.com}}');
        expect(bibtex).toContain('year = {2023}');
    });

    it("should generate bibtex for a journal article", () => {
         const source = createMockSource({
            sourceType: "journal",
            citationKey: "smith2022",
            title: "Scientific Discovery",
            author: "Jane Smith",
            publicationDate: new Date("2022-10-10")
        });

        const bibtex = generateBibTex(source);

        expect(bibtex).toContain("@article{smith2022,");
        expect(bibtex).toContain('title = {Scientific Discovery}');
        expect(bibtex).toContain('author = {Jane Smith}');
        expect(bibtex).toContain('year = {2022}');
    });

    it("should handle missing optional fields", () => {
        const source = createMockSource({
            sourceType: "website",
            citationKey: "missing2023",
            title: "Missing Info",
            author: null,
            publicationDate: null
        });

        const bibtex = generateBibTex(source);
        
        expect(bibtex).toContain("@misc{missing2023,");
        expect(bibtex).toContain('title = {Missing Info}');
        expect(bibtex).not.toContain('author =');
        expect(bibtex).not.toContain('year =');
    });

    it("should escape special characters in BibTeX", () => {
        const source = createMockSource({
            title: "Tacos & Tequila: A Guide",
            author: "O'Connor, Tim",
            citationKey: "special"
        });

        const bibtex = generateBibTex(source);
        
        expect(bibtex).toContain('title = {Tacos \\& Tequila: A Guide}');
    });
});
