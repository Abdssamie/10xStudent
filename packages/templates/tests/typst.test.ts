import { describe, it, expect } from "vitest";
import { getTemplate, getAvailableTemplates } from "../src/typst/index.js";

describe("getTemplate", () => {
  it("returns thesis template", () => {
    const template = getTemplate("thesis");
    expect(template).toContain("#bibliography");
    expect(template).toContain("#set document");
    expect(template).toContain("#set page");
    expect(template).toContain("#set text");
    expect(template).toContain("Thesis Title");
  });

  it("returns report template", () => {
    const template = getTemplate("report");
    expect(template).toContain("#bibliography");
    expect(template).toContain("#set document");
    expect(template).toContain("#set page");
    expect(template).toContain("Executive Summary");
    expect(template).toContain("Recommendations");
  });

  it("returns internship template", () => {
    const template = getTemplate("internship");
    expect(template).toContain("#bibliography");
    expect(template).toContain("#set document");
    expect(template).toContain("Internship Report");
    expect(template).toContain("Skills Acquired");
  });

  it("returns blank template", () => {
    const template = getTemplate("blank");
    expect(template).toContain("#set document");
    expect(template).toContain("#set page");
    expect(template).toContain("#set text");
    // Blank template should NOT have bibliography (no frozen sections)
    expect(template).not.toContain("#bibliography");
  });

  it("throws error for invalid template", () => {
    expect(() => getTemplate("invalid" as any)).toThrow();
  });
});

describe("getAvailableTemplates", () => {
  it("returns all available template names", () => {
    const templates = getAvailableTemplates();
    expect(templates).toEqual(["thesis", "report", "internship", "blank"]);
  });
});
