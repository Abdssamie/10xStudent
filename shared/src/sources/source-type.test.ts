import { describe, it, expect } from "vitest";
import { detectSourceType } from "./source-type";

describe("detectSourceType", () => {
    describe("journal detection", () => {
        it("detects arxiv URLs as journal", () => {
            expect(detectSourceType("https://arxiv.org/abs/1234.5678")).toBe(
                "journal",
            );
        });

        it("detects DOI URLs as journal", () => {
            expect(detectSourceType("https://doi.org/10.1000/xyz")).toBe("journal");
        });

        it("detects PubMed URLs as journal", () => {
            expect(
                detectSourceType("https://pubmed.ncbi.nlm.nih.gov/12345678"),
            ).toBe("journal");
        });

        it("detects IEEE URLs as journal", () => {
            expect(
                detectSourceType("https://ieeexplore.ieee.org/document/123456"),
            ).toBe("journal");
        });

        it("detects ScienceDirect URLs as journal", () => {
            expect(
                detectSourceType(
                    "https://www.sciencedirect.com/science/article/pii/S0123456789",
                ),
            ).toBe("journal");
        });

        it("detects Springer URLs as journal", () => {
            expect(
                detectSourceType("https://link.springer.com/article/10.1007/s123"),
            ).toBe("journal");
        });

        it("detects JSTOR URLs as journal", () => {
            expect(detectSourceType("https://www.jstor.org/stable/12345")).toBe(
                "journal",
            );
        });

        it("detects Nature URLs as journal", () => {
            expect(
                detectSourceType("https://www.nature.com/articles/s41586-024-12345"),
            ).toBe("journal");
        });

        it("detects ACM URLs as journal", () => {
            expect(detectSourceType("https://dl.acm.org/doi/10.1145/123456")).toBe(
                "journal",
            );
        });
    });

    describe("thesis detection", () => {
        it("detects thesis in URL path", () => {
            expect(
                detectSourceType("https://repository.example.edu/thesis/12345"),
            ).toBe("thesis");
        });

        it("detects dissertation in URL path", () => {
            expect(
                detectSourceType(
                    "https://scholarworks.example.edu/dissertations/12345",
                ),
            ).toBe("thesis");
        });
    });

    describe("conference detection", () => {
        it("detects conference in URL path", () => {
            expect(
                detectSourceType("https://example.org/conference/2024/papers/123"),
            ).toBe("conference");
        });

        it("detects proceedings in URL path", () => {
            expect(
                detectSourceType("https://example.org/proceedings/2024/paper.pdf"),
            ).toBe("conference");
        });

        it("detects /conf/ pattern", () => {
            expect(
                detectSourceType("https://www.usenix.org/conf/usenixsecurity24/paper"),
            ).toBe("conference");
        });
    });

    describe("blog detection", () => {
        it("detects Medium URLs as blog", () => {
            expect(detectSourceType("https://medium.com/@user/article-title")).toBe(
                "blog",
            );
        });

        it("detects dev.to URLs as blog", () => {
            expect(detectSourceType("https://dev.to/user/article-title")).toBe(
                "blog",
            );
        });

        it("detects blog subdomain as blog", () => {
            expect(detectSourceType("https://blog.example.com/post")).toBe("blog");
        });

        it("detects Hashnode URLs as blog", () => {
            expect(detectSourceType("https://user.hashnode.dev/article")).toBe(
                "blog",
            );
        });
    });

    describe("website fallback", () => {
        it("returns website for generic URLs", () => {
            expect(detectSourceType("https://example.com/page")).toBe("website");
        });

        it("returns website for Wikipedia", () => {
            expect(detectSourceType("https://en.wikipedia.org/wiki/Article")).toBe(
                "website",
            );
        });

        it("returns website for GitHub repos", () => {
            expect(detectSourceType("https://github.com/user/repo")).toBe("website");
        });
    });

    describe("edge cases", () => {
        it("handles URLs with query parameters", () => {
            expect(detectSourceType("https://arxiv.org/abs/1234.5678?format=pdf")).toBe(
                "journal",
            );
        });

        it("handles case insensitivity", () => {
            expect(detectSourceType("https://ARXIV.ORG/abs/1234")).toBe("journal");
        });

        it("handles malformed URLs gracefully", () => {
            // Falls back to string matching
            expect(detectSourceType("not-a-valid-url-but-has-arxiv.org")).toBe(
                "journal",
            );
        });
    });
});
