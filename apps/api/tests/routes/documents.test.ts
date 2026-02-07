// Set DATABASE_URL before any imports
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the database package BEFORE any imports that use it
vi.mock("@10xstudent/database", () => {
  const mockInsert = vi.fn();
  return {
    db: {
      insert: mockInsert,
    },
    schema: {
      documents: {},
    },
  };
});

// Mock auth middleware
vi.mock("@/middleware/auth", () => ({
  authMiddleware: vi.fn(async (c, next) => {
    c.set("auth", {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "test-session",
    });
    await next();
  }),
}));

import { Hono } from "hono";
import { documentsRouter } from "../../src/routes/documents.js";
import { db } from "@10xstudent/database";

describe("documents routes", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/documents", documentsRouter);

    // Setup mock chain for db.insert().values().returning()
    const mockReturning = vi.fn().mockResolvedValue([
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        title: "A",
        typstKey:
          "documents/550e8400-e29b-41d4-a716-446655440000/660e8400-e29b-41d4-a716-446655440001/main.typ",
        bibKey: null,
        template: "report",
        citationFormat: "APA",
        citationCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const mockValues = vi.fn().mockReturnValue({
      returning: mockReturning,
    });

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: mockValues,
    });
  });

  it("creates a document with typstKey", async () => {
    const res = await app.request("/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "A", template: "report" }),
    });

    const json = (await res.json()) as { typstKey: string };
    expect(json.typstKey).toContain("documents/");
  });
});
