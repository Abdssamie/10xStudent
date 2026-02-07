import { describe, it, expect } from "vitest";
import { createDocumentSchema } from "../../src/document";

describe("document schema", () => {
  it("requires typstKey and removes typst content", () => {
    const result = createDocumentSchema.safeParse({
      title: "Test",
      template: "report",
      citationFormat: "APA",
      typstKey: "documents/u/d/main.typ",
    });
    expect(result.success).toBe(true);
  });
});
