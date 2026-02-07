import { describe, it, expect } from "vitest";
import { generateCitationKey } from "../../src/citations/keys";

describe("generateCitationKey", () => {
  it("adds suffixes for collisions", () => {
    const existing = new Set(["einstein1905", "einstein1905a"]);
    const key = generateCitationKey({ author: "Albert Einstein", year: 1905 }, existing);
    expect(key).toBe("einstein1905b");
  });
});
