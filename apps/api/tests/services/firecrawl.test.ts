import { describe, it, expect } from "vitest";
import { buildSearchRequest } from "../../src/services/firecrawl.js";

describe("buildSearchRequest", () => {
  it("builds the Firecrawl search payload", () => {
    expect(buildSearchRequest("typst thesis")).toEqual({
      query: "typst thesis",
      limit: 5,
    });
  });

  it("uses default limit of 5", () => {
    const result = buildSearchRequest("test query");
    expect(result.limit).toBe(5);
  });

  it("includes the query string", () => {
    const result = buildSearchRequest("machine learning");
    expect(result.query).toBe("machine learning");
  });
});
