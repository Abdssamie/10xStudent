import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestDatabaseService } from "../helpers/test-database-service";
import { MockStorageService } from "../helpers/mock-storage-service";
import { createTestAppWithRouter } from "../helpers/test-app";
import { documentsRouter } from "@/routes/documents";
import type { ServiceContainer } from "@/services/container";
import { CreditManager } from "@/services/credit-manager";
import { AgentService } from "@/services/agent";
import * as schema from "@/infrastructure/db/schema";
import type { User } from "@/infrastructure/db/schema";

describe("GET /api/v1/documents/:id/bibliography", () => {
  let testDb: TestDatabaseService;
  let serviceContainer: ServiceContainer;
  let mockStorage: MockStorageService;
  let testUser: User;
  const testClerkId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(async () => {
    testDb = new TestDatabaseService(process.env.DATABASE_URL!);
    await testDb.cleanDatabase();
    testUser = await testDb.seedTestUser(testClerkId, 1000);
    
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
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId: testUser.id,
      title: "Test Doc",
      template: "research-paper",
      typstKey: `documents/${testUser.id}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

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

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { bibliography: string };
    expect(data.bibliography).toBeDefined();
    expect(typeof data.bibliography).toBe("string");
    
    expect(data.bibliography).toContain("smith2023");
    expect(data.bibliography).toContain("Machine Learning Advances");
    expect(data.bibliography).toContain("John Smith");
    expect(data.bibliography).toContain("doe2024");
    expect(data.bibliography).toContain("Deep Learning Fundamentals");
    expect(data.bibliography).toContain("Jane Doe");
    
    expect(data.bibliography).toContain("@");
    expect(data.bibliography).toContain("{");
    expect(data.bibliography).toContain("}");
  });

  it("should return empty bibliography if no sources", async () => {
    const documentId = crypto.randomUUID();
    const db = testDb.getDb();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId: testUser.id,
      title: "Test Doc",
      template: "research-paper",
      typstKey: `documents/${testUser.id}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { bibliography: string };
    expect(data.bibliography).toBe("");
  });

  it("should return 404 if document not found", async () => {
    const fakeId = crypto.randomUUID();

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${fakeId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });

  it("should return 404 if user does not own document", async () => {
    const documentId = crypto.randomUUID();
    const otherClerkId = "660e8400-e29b-41d4-a716-446655440002";
    const db = testDb.getDb();
    
    const otherUser = await testDb.seedTestUser(otherClerkId, 1000);
    await db.insert(schema.documents).values({
      id: documentId,
      userId: otherUser.id,
      title: "Other User Doc",
      template: "research-paper",
      typstKey: `documents/${otherUser.id}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

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

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });

  it("should cache bibliography in R2", async () => {
    const documentId = crypto.randomUUID();
    const db = testDb.getDb();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId: testUser.id,
      title: "Test Doc",
      template: "research-paper",
      typstKey: `documents/${testUser.id}/${documentId}/main.typ`,
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

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    
    const response1 = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });
    expect(response1.status).toBe(200);
    const data1 = (await response1.json()) as { bibliography: string };
    
    const response2 = await app.request(`/${documentId}/bibliography`, {
      method: "GET",
    });
    expect(response2.status).toBe(200);
    const data2 = (await response2.json()) as { bibliography: string };
    
    expect(data1.bibliography).toBe(data2.bibliography);
    expect(data2.bibliography).toContain("cached2023");
    expect(data2.bibliography).toContain("Cached Paper");
  });
});
