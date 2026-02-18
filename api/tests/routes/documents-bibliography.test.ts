import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestDatabaseService } from "../helpers/test-database-service";
import { MockStorageService } from "../helpers/mock-storage-service";
import { createTestAppWithRouter } from "../helpers/test-app";
import { documentsRouter } from "@/routes/documents";
import type { ServiceContainer } from "@/services/container";
import { CreditManager } from "@/services/credit-manager";
import { AgentService } from "@/services/agent";
import * as schema from "@/infrastructure/db/schema";

describe("GET /api/v1/documents/:id/bibliography", () => {
  const userId = "660e8400-e29b-41d4-a716-446655440001";
  let testDb: TestDatabaseService;
  let serviceContainer: ServiceContainer;
  let mockStorage: MockStorageService;

  beforeEach(async () => {
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    await testDb.cleanDatabase();
    await testDb.seedTestUser(userId, 1000);
    
    // Create service container with mock storage
    mockStorage = new MockStorageService();
    const db = testDb.getDb();
    const creditManager = new CreditManager(db);
    const agentService = new AgentService(db, creditManager);
    
    serviceContainer = {
      db,
      creditManager,
      agentService,
      storageService: mockStorage,
    };
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("should generate BibTeX from document sources", async () => {
    const documentId = crypto.randomUUID();
    const db = testDb.getDb();
    
    // Create document
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    // Create two sources
    await db.insert(schema.sources).values([
      {
        id: crypto.randomUUID(),
        documentId,
        url: "https://example.com/paper1",
        citationKey: "smith2023",
        title: "Machine Learning Advances",
        author: "John Smith",
        publicationDate: new Date("2023-05-15"),
        sourceType: "journal",
      },
      {
        id: crypto.randomUUID(),
        documentId,
        url: "https://example.com/paper2",
        citationKey: "doe2024",
        title: "Deep Learning Fundamentals",
        author: "Jane Doe",
        publicationDate: new Date("2024-01-20"),
        sourceType: "book",
      },
    ]);

    const app = createTestAppWithRouter(serviceContainer, userId, documentsRouter, "/");
    const response = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.bibliography).toBeDefined();
    expect(typeof data.bibliography).toBe("string");
    
    // Verify both sources are in the bibliography
    expect(data.bibliography).toContain("smith2023");
    expect(data.bibliography).toContain("Machine Learning Advances");
    expect(data.bibliography).toContain("John Smith");
    expect(data.bibliography).toContain("doe2024");
    expect(data.bibliography).toContain("Deep Learning Fundamentals");
    expect(data.bibliography).toContain("Jane Doe");
    
    // Verify BibTeX format markers
    expect(data.bibliography).toContain("@");
    expect(data.bibliography).toContain("{");
    expect(data.bibliography).toContain("}");
  });

  it("should return empty bibliography if no sources", async () => {
    const documentId = crypto.randomUUID();
    const db = testDb.getDb();
    
    // Create document without sources
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const app = createTestAppWithRouter(serviceContainer, userId, documentsRouter, "/");
    const response = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.bibliography).toBe("");
  });

  it("should return 404 if document not found", async () => {
    const fakeId = crypto.randomUUID();

    const app = createTestAppWithRouter(serviceContainer, userId, documentsRouter, "/");
    const response = await app.request(`/${fakeId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });

  it("should return 404 if user does not own document", async () => {
    const documentId = crypto.randomUUID();
    const otherUserId = "660e8400-e29b-41d4-a716-446655440002";
    const db = testDb.getDb();
    
    await testDb.seedTestUser(otherUserId, 1000);
    await db.insert(schema.documents).values({
      id: documentId,
      userId: otherUserId,
      title: "Other User Doc",
      template: "default",
      typstKey: `documents/${otherUserId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    // Add a source to the other user's document
    await db.insert(schema.sources).values({
      id: crypto.randomUUID(),
      documentId,
      url: "https://example.com/paper",
      citationKey: "other2023",
      title: "Other Paper",
      author: "Other Author",
      publicationDate: new Date("2023-01-01"),
      sourceType: "journal",
    });

    const app = createTestAppWithRouter(serviceContainer, userId, documentsRouter, "/");
    const response = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });

  it("should cache bibliography in R2", async () => {
    const documentId = crypto.randomUUID();
    const db = testDb.getDb();
    
    // Create document with source
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    await db.insert(schema.sources).values({
      id: crypto.randomUUID(),
      documentId,
      url: "https://example.com/paper",
      citationKey: "cached2023",
      title: "Cached Paper",
      author: "Cache Author",
      publicationDate: new Date("2023-06-10"),
      sourceType: "journal",
    });

    const app = createTestAppWithRouter(serviceContainer, userId, documentsRouter, "/");
    
    // First request - should generate and cache
    const response1 = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    
    // Second request - should retrieve from cache
    const response2 = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    
    // Both responses should be identical
    expect(data1.bibliography).toBe(data2.bibliography);
    expect(data2.bibliography).toContain("cached2023");
    expect(data2.bibliography).toContain("Cached Paper");
  });
});
