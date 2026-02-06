/**
 * @id: sources-crud-routes
 * @priority: high
 * @progress: 0
 * @directive: Implement Hono REST API routes for source management with async embedding generation
 * @context: specs/04-source-management-rag.md#source-api-endpoints
 * @checklist: [
 *   "Implement POST /api/sources - Create source with automatic metadata extraction",
 *   "Implement GET /api/sources/:documentId - List sources for document",
 *   "Implement PUT /api/sources/:id - Update source metadata",
 *   "Implement DELETE /api/sources/:id - Delete source",
 *   "Extract metadata from URL using cheerio (title, author, publicationDate, content)",
 *   "Create source immediately with embedding: null (async generation)",
 *   "Apply authMiddleware and verify document ownership",
 *   "Handle extraction failures gracefully (store URL only, isAvailable: false)"
 * ]
 * @deps: ["sources-schema", "auth-middleware", "source-extractor", "source-schemas"]
 * @skills: ["hono", "drizzle-orm", "cheerio", "typescript"]
 */
export const _hole = null;
