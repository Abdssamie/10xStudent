// TODO: Add integration tests for chat endpoints
// - Test with real database (TestContainers PostgreSQL)
// - Test authentication flow with real Clerk tokens or mock auth server
// - Test SSE streaming with actual HTTP requests
// - Test tool execution with real tool implementations
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../src/routes/chat.js";

describe("buildSystemPrompt", () => {
  it("enforces citation accuracy", () => {
    expect(buildSystemPrompt()).toContain(
      "Only cite claims present in sources",
    );
  });

  it("mentions @citation-key format", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("@citation-key");
    expect(prompt).toContain("@einstein1905");
  });

  it("instructs to prefer recent sources", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Prefer recent sources");
  });

  it("prohibits hallucination", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Never hallucinate");
    expect(prompt).toContain(
      "Never cite a source that was not provided to you",
    );
  });

  it("requires citations for factual claims", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(
      "Every factual claim must be supported by a citation",
    );
  });

  it("prohibits numbered citation formats", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Do not use numbered citations");
  });
});
