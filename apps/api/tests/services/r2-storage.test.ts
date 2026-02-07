import { describe, it, expect } from "vitest";
import { buildR2Key } from "../../src/services/r2-storage";

describe("buildR2Key", () => {
  it("builds document key from user and doc", () => {
    expect(buildR2Key("user", "doc")).toBe("documents/user/doc/main.typ");
  });
});
