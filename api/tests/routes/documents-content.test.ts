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

describe("GET /api/v1/documents/:id/content", () => {
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

  it("should retrieve Typst content from R2", async () => {
    const documentId = crypto.randomUUID();
    const typstContent = "= My Document\n\nThis is content.";
    const db = testDb.getDb();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId: testUser.id,
      title: "Test Doc",
      template: "research-paper",
      typstKey: `documents/${testUser.id}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    await mockStorage.uploadDocument(testUser.id, documentId, typstContent);

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/content`, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { content: string };
    expect(data.content).toBe(typstContent);
  });

  it("should return 404 if document not found in database", async () => {
    const fakeId = crypto.randomUUID();

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${fakeId}/content`, {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });

  it("should return 404 if content not found in R2", async () => {
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
    const response = await app.request(`/${documentId}/content`, {
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

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/content`, {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/v1/documents/:id/content", () => {
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

  it("should update Typst content in R2", async () => {
    const documentId = crypto.randomUUID();
    const initialContent = "= Initial\n\nOld content.";
    const updatedContent = "= Updated\n\nNew content.";
    const db = testDb.getDb();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId: testUser.id,
      title: "Test Doc",
      template: "research-paper",
      typstKey: `documents/${testUser.id}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    await mockStorage.uploadDocument(testUser.id, documentId, initialContent);

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updatedContent }),
    });

    expect(response.status).toBe(200);

    const retrievedContent = await mockStorage.getDocument(testUser.id, documentId);
    expect(retrievedContent).toBe(updatedContent);
  });

  it("should return 400 if content is empty", async () => {
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
    const response = await app.request(`/${documentId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    expect(response.status).toBe(400);
  });

  it("should return 404 if document not found", async () => {
    const fakeId = crypto.randomUUID();

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${fakeId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "test" }),
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

    const app = createTestAppWithRouter(serviceContainer, testUser, documentsRouter, "/");
    const response = await app.request(`/${documentId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "test" }),
    });

    expect(response.status).toBe(404);
  });
});
