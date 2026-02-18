import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { schema, eq, and } from "@/infrastructure/db";
import { authMiddleware } from "@/middleware/auth";
import { logger } from "@/utils/logger";
import { NotFoundError } from "@/infrastructure/errors";
import { requireDocumentOwnership } from "@/utils/ownership";
import {
  createDocumentSchema,
  documentResponseSchema,
  updateDocumentBodySchema,
  documentContentResponseSchema,
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
