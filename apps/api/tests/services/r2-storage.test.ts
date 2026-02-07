import { describe, it, expect } from "vitest";
import {
  buildR2Key,
  buildBibKey,
  buildAssetKey,
  validateUserId,
  validateDocumentId,
  sanitizeFilename,
} from "../../src/services/r2-storage.js";

describe("validateUserId", () => {
  it("accepts valid UUID v4", () => {
    expect(() =>
      validateUserId("550e8400-e29b-41d4-a716-446655440000"),
    ).not.toThrow();
  });

  it("accepts valid UUID v7", () => {
    expect(() =>
      validateUserId("018e8400-e29b-71d4-a716-446655440000"),
    ).not.toThrow();
  });

  it("accepts uppercase UUIDs", () => {
    expect(() =>
      validateUserId("550E8400-E29B-41D4-A716-446655440000"),
    ).not.toThrow();
  });

  it("throws on invalid UUID format", () => {
    expect(() => validateUserId("not-a-uuid")).toThrow(
      "Invalid userId format: must be a valid UUID",
    );
  });

  it("throws on empty string", () => {
    expect(() => validateUserId("")).toThrow(
      "Invalid userId format: must be a valid UUID",
    );
  });

  it("throws on path traversal attempt", () => {
    expect(() => validateUserId("../../../etc/passwd")).toThrow(
      "Invalid userId format: must be a valid UUID",
    );
  });

  it("throws on UUID with extra characters", () => {
    expect(() =>
      validateUserId("550e8400-e29b-41d4-a716-446655440000extra"),
    ).toThrow("Invalid userId format: must be a valid UUID");
  });
});

describe("validateDocumentId", () => {
  it("accepts valid UUID v4", () => {
    expect(() =>
      validateDocumentId("750e8400-e29b-41d4-a716-446655440000"),
    ).not.toThrow();
  });

  it("accepts valid UUID v7", () => {
    expect(() =>
      validateDocumentId("018e8400-e29b-71d4-a716-446655440000"),
    ).not.toThrow();
  });

  it("throws on invalid UUID format", () => {
    expect(() => validateDocumentId("not-a-uuid")).toThrow(
      "Invalid documentId format: must be a valid UUID",
    );
  });

  it("throws on empty string", () => {
    expect(() => validateDocumentId("")).toThrow(
      "Invalid documentId format: must be a valid UUID",
    );
  });

  it("throws on path traversal attempt", () => {
    expect(() => validateDocumentId("../../sensitive")).toThrow(
      "Invalid documentId format: must be a valid UUID",
    );
  });
});

describe("sanitizeFilename", () => {
  it("preserves safe filenames", () => {
    expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
  });

  it("preserves filenames with spaces", () => {
    expect(sanitizeFilename("my document.pdf")).toBe("my document.pdf");
  });

  it("removes forward slashes", () => {
    expect(sanitizeFilename("path/to/file.txt")).toBe("pathtofile.txt");
  });

  it("removes backslashes", () => {
    expect(sanitizeFilename("path\\to\\file.txt")).toBe("pathtofile.txt");
  });

  it("removes parent directory references", () => {
    // sanitize-filename removes / and \ but preserves dots
    expect(sanitizeFilename("../../../etc/passwd")).toBe("......etcpasswd");
  });

  it("removes multiple dangerous characters", () => {
    // sanitize-filename removes / and \ but preserves dots
    expect(sanitizeFilename("../path\\to/file.txt")).toBe("..pathtofile.txt");
  });

  it("removes reserved characters", () => {
    expect(sanitizeFilename("file?name<test>.txt")).toBe("filenametest.txt");
  });

  it("removes colons and pipes", () => {
    expect(sanitizeFilename("file:name|test.txt")).toBe("filenametest.txt");
  });

  it("preserves original casing", () => {
    expect(sanitizeFilename("MyDocument.PDF")).toBe("MyDocument.PDF");
  });

  it("truncates filenames longer than 255 bytes", () => {
    const longFilename = "a".repeat(300) + ".txt";
    const sanitized = sanitizeFilename(longFilename);
    expect(sanitized.length).toBeLessThanOrEqual(255);
  });

  it("handles filenames with multiple dots", () => {
    expect(sanitizeFilename("my.file.name.tar.gz")).toBe("my.file.name.tar.gz");
  });

  it("removes trailing periods and spaces (Windows compatibility)", () => {
    expect(sanitizeFilename("filename. ")).toBe("filename");
  });

  it("throws on empty filename", () => {
    expect(() => sanitizeFilename("")).toThrow("Filename cannot be empty");
  });

  it("throws when sanitization results in empty string", () => {
    expect(() => sanitizeFilename("..")).toThrow(
      "Filename cannot be empty after sanitization",
    );
  });

  it("throws when sanitization results in empty string for single dot", () => {
    expect(() => sanitizeFilename(".")).toThrow(
      "Filename cannot be empty after sanitization",
    );
  });
});

describe("buildR2Key", () => {
  it("builds document key from user and doc", () => {
    expect(
      buildR2Key(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe(
      "documents/550e8400-e29b-41d4-a716-446655440000/750e8400-e29b-41d4-a716-446655440000/main.typ",
    );
  });

  it("throws on invalid userId", () => {
    expect(() =>
      buildR2Key("invalid", "750e8400-e29b-41d4-a716-446655440000"),
    ).toThrow("Invalid userId format");
  });

  it("throws on invalid documentId", () => {
    expect(() =>
      buildR2Key("550e8400-e29b-41d4-a716-446655440000", "invalid"),
    ).toThrow("Invalid documentId format");
  });

  it("prevents path traversal via userId", () => {
    expect(() =>
      buildR2Key("../../etc", "750e8400-e29b-41d4-a716-446655440000"),
    ).toThrow("Invalid userId format");
  });

  it("prevents path traversal via documentId", () => {
    expect(() =>
      buildR2Key("550e8400-e29b-41d4-a716-446655440000", "../../../passwd"),
    ).toThrow("Invalid documentId format");
  });
});

describe("buildBibKey", () => {
  it("builds bibliography key from user and doc", () => {
    expect(
      buildBibKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe(
      "documents/550e8400-e29b-41d4-a716-446655440000/750e8400-e29b-41d4-a716-446655440000/refs.bib",
    );
  });

  it("throws on invalid userId", () => {
    expect(() =>
      buildBibKey("invalid", "750e8400-e29b-41d4-a716-446655440000"),
    ).toThrow("Invalid userId format");
  });

  it("throws on invalid documentId", () => {
    expect(() =>
      buildBibKey("550e8400-e29b-41d4-a716-446655440000", "invalid"),
    ).toThrow("Invalid documentId format");
  });

  it("prevents path traversal via userId", () => {
    expect(() =>
      buildBibKey("../../etc", "750e8400-e29b-41d4-a716-446655440000"),
    ).toThrow("Invalid userId format");
  });

  it("prevents path traversal via documentId", () => {
    expect(() =>
      buildBibKey("550e8400-e29b-41d4-a716-446655440000", "../../../passwd"),
    ).toThrow("Invalid documentId format");
  });
});

describe("buildAssetKey", () => {
  it("builds asset key with safe filename", () => {
    expect(
      buildAssetKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
        "image.png",
      ),
    ).toBe(
      "documents/550e8400-e29b-41d4-a716-446655440000/750e8400-e29b-41d4-a716-446655440000/assets/image.png",
    );
  });

  it("sanitizes filename with path traversal", () => {
    expect(
      buildAssetKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
        "../../../etc/passwd",
      ),
    ).toBe(
      "documents/550e8400-e29b-41d4-a716-446655440000/750e8400-e29b-41d4-a716-446655440000/assets/......etcpasswd",
    );
  });

  it("sanitizes filename with slashes", () => {
    expect(
      buildAssetKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
        "path/to/file.txt",
      ),
    ).toBe(
      "documents/550e8400-e29b-41d4-a716-446655440000/750e8400-e29b-41d4-a716-446655440000/assets/pathtofile.txt",
    );
  });

  it("preserves spaces in filename", () => {
    expect(
      buildAssetKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
        "my document.pdf",
      ),
    ).toBe(
      "documents/550e8400-e29b-41d4-a716-446655440000/750e8400-e29b-41d4-a716-446655440000/assets/my document.pdf",
    );
  });

  it("throws on invalid userId", () => {
    expect(() =>
      buildAssetKey(
        "invalid",
        "750e8400-e29b-41d4-a716-446655440000",
        "file.txt",
      ),
    ).toThrow("Invalid userId format");
  });

  it("throws on invalid documentId", () => {
    expect(() =>
      buildAssetKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "invalid",
        "file.txt",
      ),
    ).toThrow("Invalid documentId format");
  });

  it("throws on empty filename", () => {
    expect(() =>
      buildAssetKey(
        "550e8400-e29b-41d4-a716-446655440000",
        "750e8400-e29b-41d4-a716-446655440000",
        "",
      ),
    ).toThrow("Filename cannot be empty");
  });
});
