// Set environment variables before imports
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.FIRECRAWL_API_KEY = "test-key";

import { describe, it, expect } from "vitest";
import { buildSearchRequest } from "@/services/firecrawl";

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
