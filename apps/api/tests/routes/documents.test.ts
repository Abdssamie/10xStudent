// Set DATABASE_URL before any imports
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the database package BEFORE any imports that use it
vi.mock("@10xstudent/database", () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    },
    schema: {
      documents: {},
    },
    eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
    and: vi.fn((...conditions) => ({ conditions, type: "and" })),
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

// Mock S3 client
vi.mock("@/services/r2-client", () => ({
  s3Client: {
    send: vi.fn().mockResolvedValue({}),
  },
  R2_BUCKET_NAME: "test-bucket",
}));

import { Hono } from "hono";
import { documentsRouter } from "../../src/routes/documents.js";
import { db } from "@10xstudent/database";
import { s3Client } from "@/services/r2-client";

describe("documents routes", () => {
  let app: Hono;
  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
  const mockDocId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/documents", documentsRouter);
  });

  describe("POST /documents", () => {
    it("creates a document with typstKey and uploads to R2", async () => {
      // Setup mock chain for db.insert().values().returning()
      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: mockDocId,
          userId: mockUserId,
          title: "Test Document",
          typstKey: `documents/${mockUserId}/${mockDocId}/main.typ`,
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

      const res = await app.request("/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Test Document", template: "report" }),
      });

      const json = (await res.json()) as { typstKey: string };
      expect(json.typstKey).toContain("documents/");
      expect(s3Client.send).toHaveBeenCalled();
    });
  });

  describe("GET /documents", () => {
    it("returns list of user documents", async () => {
      const mockDocuments = [
        {
          id: mockDocId,
          userId: mockUserId,
          title: "Doc 1",
          typstKey: `documents/${mockUserId}/${mockDocId}/main.typ`,
          template: "report",
          citationFormat: "APA",
          citationCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockWhere = vi.fn().mockResolvedValue(mockDocuments);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });

      const res = await app.request("/documents", {
        method: "GET",
      });

      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
    });
  });

  describe("PATCH /documents/:id", () => {
    it("updates document metadata", async () => {
      const updatedDoc = {
        id: mockDocId,
        userId: mockUserId,
        title: "Updated Title",
        typstKey: `documents/${mockUserId}/${mockDocId}/main.typ`,
        template: "report",
        citationFormat: "APA",
        citationCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const res = await app.request(`/documents/${mockDocId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as { title: string };
      expect(json.title).toBe("Updated Title");
    });

    it("returns 404 for non-existent document", async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const res = await app.request(`/documents/${mockDocId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /documents/:id", () => {
    it("deletes document from DB and R2", async () => {
      const mockDoc = {
        id: mockDocId,
        userId: mockUserId,
        title: "Doc to Delete",
        typstKey: `documents/${mockUserId}/${mockDocId}/main.typ`,
        template: "report",
        citationFormat: "APA",
        citationCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock select query
      const mockWhere = vi.fn().mockResolvedValue([mockDoc]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });

      // Mock delete query
      const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: mockDeleteWhere,
      });

      const res = await app.request(`/documents/${mockDocId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);
      expect(s3Client.send).toHaveBeenCalled();
    });

    it("returns 404 for non-existent document", async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });

      const res = await app.request(`/documents/${mockDocId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
