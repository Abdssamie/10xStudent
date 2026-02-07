import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../src/routes/chat.js";

describe("buildSystemPrompt", () => {
  it("enforces citation accuracy", () => {
    expect(buildSystemPrompt()).toContain(
      "Only cite claims present in sources",
    );
  });
});
