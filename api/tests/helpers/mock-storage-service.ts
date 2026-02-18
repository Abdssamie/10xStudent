import { NotFoundError } from "@/infrastructure/errors";
import type { StorageService } from "@/services/storage/interface";

/**
 * In-memory mock storage service for testing
 * Stores content in memory instead of making real S3/R2 calls
 */
export class MockStorageService implements StorageService {
  private storage = new Map<string, string | Buffer>();

  async uploadDocument(
    userId: string,
    documentId: string,
    content: string | Buffer
  ): Promise<void> {
    const key = `documents/${userId}/${documentId}/main.typ`;
    this.storage.set(key, content);
  }

  async getDocument(userId: string, documentId: string): Promise<string> {
    const key = `documents/${userId}/${documentId}/main.typ`;
    const content = this.storage.get(key);
    if (!content) {
      throw new NotFoundError("Document not found in storage");
    }
    return content.toString();
  }

  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const key = `documents/${userId}/${documentId}/main.typ`;
    this.storage.delete(key);
  }

  async uploadBibliography(
    userId: string,
    documentId: string,
    content: string | Buffer
  ): Promise<void> {
    const key = `documents/${userId}/${documentId}/refs.bib`;
    this.storage.set(key, content);
  }

  async getBibliography(userId: string, documentId: string): Promise<string> {
    const key = `documents/${userId}/${documentId}/refs.bib`;
    const content = this.storage.get(key);
    if (!content) {
      throw new NotFoundError("Bibliography not found in storage");
    }
    return content.toString();
  }

  async deleteBibliography(userId: string, documentId: string): Promise<void> {
    const key = `documents/${userId}/${documentId}/refs.bib`;
    this.storage.delete(key);
  }

  async uploadAsset(
    userId: string,
    documentId: string,
    filename: string,
    content: Buffer,
    contentType: string
  ): Promise<void> {
    const key = `documents/${userId}/${documentId}/assets/${filename}`;
    this.storage.set(key, content);
  }

  async getAsset(
    userId: string,
    documentId: string,
    filename: string
  ): Promise<Buffer> {
    const key = `documents/${userId}/${documentId}/assets/${filename}`;
    const content = this.storage.get(key);
    if (!content) {
      throw new NotFoundError("Asset not found in storage");
    }
    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  }

  async deleteAsset(
    userId: string,
    documentId: string,
    filename: string
  ): Promise<void> {
    const key = `documents/${userId}/${documentId}/assets/${filename}`;
    this.storage.delete(key);
  }

  getPublicUrl(key: string): string {
    return `https://mock-storage.example.com/${key}`;
  }

  /**
   * Test helper: clear all stored content
   */
  clear(): void {
    this.storage.clear();
  }
}
