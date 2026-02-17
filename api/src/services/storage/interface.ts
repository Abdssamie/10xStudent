/**
 * Storage service interface for document, bibliography, and asset operations
 * Abstracts storage implementation details from application logic
 */

export interface StorageService {
  /**
   * Upload a document's main Typst file
   */
  uploadDocument(
    userId: string,
    documentId: string,
    content: string | Buffer
  ): Promise<void>;

  /**
   * Get a document's main Typst file
   */
  getDocument(userId: string, documentId: string): Promise<string>;

  /**
   * Delete a document's main Typst file
   */
  deleteDocument(userId: string, documentId: string): Promise<void>;

  /**
   * Upload a document's bibliography file
   */
  uploadBibliography(
    userId: string,
    documentId: string,
    content: string | Buffer
  ): Promise<void>;

  /**
   * Get a document's bibliography file
   */
  getBibliography(userId: string, documentId: string): Promise<string>;

  /**
   * Delete a document's bibliography file
   */
  deleteBibliography(userId: string, documentId: string): Promise<void>;

  /**
   * Upload an asset file (image, etc.)
   */
  uploadAsset(
    userId: string,
    documentId: string,
    filename: string,
    content: Buffer,
    contentType: string
  ): Promise<void>;

  /**
   * Get an asset file
   */
  getAsset(
    userId: string,
    documentId: string,
    filename: string
  ): Promise<Buffer>;

  /**
   * Delete an asset file
   */
  deleteAsset(
    userId: string,
    documentId: string,
    filename: string
  ): Promise<void>;

  /**
   * Get public URL for a storage key
   */
  getPublicUrl(key: string): string;
}
