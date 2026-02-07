import { describe, it, expect } from "vitest";
import { detectSourceType } from "../../src/sources/source-type.js";

describe("detectSourceType", () => {
  it("labels arxiv as journal", () => {
    expect(detectSourceType("https://arxiv.org/abs/1234.5678")).toBe("journal");
  });

  it("labels doi.org as journal", () => {
    expect(detectSourceType("https://doi.org/10.1234/example")).toBe("journal");
  });

  it("labels thesis URLs as thesis", () => {
    expect(detectSourceType("https://example.edu/thesis/paper.pdf")).toBe(
      "thesis",
    );
  });

  it("labels conference URLs as conference", () => {
    expect(detectSourceType("https://example.com/conference/proceedings")).toBe(
      "conference",
    );
  });

  it("defaults to website for unknown URLs", () => {
    expect(detectSourceType("https://example.com/article")).toBe("website");
  });

  it("is case insensitive", () => {
    expect(detectSourceType("https://ARXIV.ORG/abs/1234")).toBe("journal");
  });
});
