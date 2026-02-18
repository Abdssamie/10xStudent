import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { schema, eq, and } from "@/infrastructure/db";
import { authMiddleware } from "@/middleware/auth";
import { logger } from "@/utils/logger";
import { NotFoundError } from "@/infrastructure/errors";
import { requireDocumentOwnership } from "@/utils/ownership";
import { generateBibTex } from "@/utils/bibtex";
import {
  createDocumentSchema,
  documentResponseSchema,
  updateDocumentBodySchema,
  documentContentResponseSchema,
  updateDocumentContentBodySchema,
  bibliographyResponseSchema,
} from "@shared/src";

const { documents } = schema;

export const documentsRouter = new OpenAPIHono();

const createDocumentRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createDocumentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: documentResponseSchema,
        },
      },
      description: "Document created successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(createDocumentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  const { title, template, citationFormat } = c.req.valid("json");

  const documentId = crypto.randomUUID();
  const stubContent = `= ${title}\n\n`;

  await storageService.uploadDocument(userId, documentId, stubContent);

  const typstKey = `documents/${userId}/${documentId}/main.typ`;

  const [document] = await db
    .insert(documents)
    .values({
      id: documentId,
      userId,
      title,
      template,
      typstKey,
      citationFormat,
    })
    .returning();

  if (!document) throw new NotFoundError("Failed to create document");

  return c.json(document);
});

const listDocumentsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(documentResponseSchema),
        },
      },
      description: "List of user documents",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(listDocumentsRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;

  const userDocuments = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId));

  return c.json(userDocuments);
});

const updateDocumentRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateDocumentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: documentResponseSchema,
        },
      },
      description: "Document updated successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(updateDocumentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;

  await requireDocumentOwnership(documentId, userId, db);

  const body = c.req.valid("json");
  const updates: Record<string, string> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.template !== undefined) updates.template = body.template;
  if (body.citationFormat !== undefined) updates.citationFormat = body.citationFormat;

  const [updated] = await db
    .update(documents)
    .set(updates)
    .where(eq(documents.id, documentId))
    .returning();

  if (!updated) throw new NotFoundError("Failed to update document");

  return c.json(updated);
});

const deleteDocumentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Document deleted successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(deleteDocumentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  try {
    await storageService.deleteDocument(userId, documentId);
  } catch (error) {
    logger.error({ error, documentId }, "Failed to delete from R2 - continuing with DB deletion");
  }

  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  return c.body(null, 204);
});

const getDocumentContentRoute = createRoute({
  method: "get",
  path: "/{id}/content",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: documentContentResponseSchema,
        },
      },
      description: "Document Typst content retrieved successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(getDocumentContentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  const content = await storageService.getDocument(userId, documentId);

  logger.info({ userId, documentId }, "Document content retrieved");

  return c.json({ content });
});

const updateDocumentContentRoute = createRoute({
  method: "put",
  path: "/{id}/content",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateDocumentContentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Document content updated successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(updateDocumentContentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const { content } = c.req.valid("json");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  await storageService.uploadDocument(userId, documentId, content);

  logger.info({ userId, documentId, contentLength: content.length }, "Document content updated");

  return c.json({ success: true });
});

const getDocumentBibliographyRoute = createRoute({
  method: "get",
  path: "/{id}/bibliography",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: bibliographyResponseSchema,
        },
      },
      description: "Document bibliography retrieved successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(getDocumentBibliographyRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  // Try to retrieve cached bibliography from R2
  try {
    const cachedBibliography = await storageService.getBibliography(userId, documentId);
    logger.debug({ userId, documentId }, "Bibliography retrieved from cache");
    return c.json({ bibliography: cachedBibliography });
  } catch (error) {
    logger.debug({ error, userId, documentId }, "Bibliography cache miss, generating fresh");
  }

  // Cache miss - generate fresh bibliography
  const documentSources = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.documentId, documentId));

  const bibtexEntries = documentSources.map((source) => generateBibTex(source));
  const bibliography = bibtexEntries.join("\n\n");

  // Cache the result in R2
  try {
    await storageService.uploadBibliography(userId, documentId, bibliography);
    logger.debug({ userId, documentId }, "Bibliography cached successfully");
  } catch (error) {
    logger.error({ error, userId, documentId }, "Failed to cache bibliography");
  }

  logger.info({ userId, documentId, sourceCount: documentSources.length }, "Bibliography generated");

  return c.json({ bibliography });
});
