/**
 * Assets CRUD routes
 * Manage document assets (images, files) stored in R2
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { assetResponseSchema } from "@shared/api/assets";

import { schema, eq, and } from "@/infrastructure/db";
import { NotFoundError, ValidationError } from "@/infrastructure/errors";
import { logger } from "@/utils/logger";
import { requireDocumentOwnership } from "@/utils/ownership";

const { assets } = schema;

export const assetsRouter = new OpenAPIHono();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

function generateFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${timestamp}-${sanitized}`;
}

function buildR2Key(userId: string, documentId: string, filename: string): string {
  return `documents/${userId}/${documentId}/assets/${filename}`;
}

const uploadAssetRoute = createRoute({
  method: "post",
  path: "/{documentId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: assetResponseSchema,
        },
      },
      description: "Asset uploaded successfully",
    },
  },
  tags: ["Assets"],
});

assetsRouter.openapi(uploadAssetRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    throw new ValidationError("No file uploaded");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File size exceeds 10MB limit");
  }

  const contentType = file.type;
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new ValidationError(
      "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF"
    );
  }

  const filename = generateFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  await storageService.uploadAsset(
    userId,
    documentId,
    filename,
    buffer,
    contentType
  );

  const r2Key = buildR2Key(userId, documentId, filename);

  const [asset] = await db
    .insert(assets)
    .values({
      documentId,
      r2Key,
      filename,
      contentType,
      size: file.size,
    })
    .returning();

  if (!asset) {
    throw new NotFoundError("Failed to create asset");
  }

  logger.info(
    { userId, documentId, assetId: asset.id, filename, size: file.size },
    "Asset uploaded"
  );

  return c.json(asset, 201);
});

const listAssetsRoute = createRoute({
  method: "get",
  path: "/{documentId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(assetResponseSchema),
        },
      },
      description: "List of document assets",
    },
  },
  tags: ["Assets"],
});

assetsRouter.openapi(listAssetsRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;

  await requireDocumentOwnership(documentId, userId, db);

  const documentAssets = await db
    .select({
      id: assets.id,
      filename: assets.filename,
      contentType: assets.contentType,
      size: assets.size,
      createdAt: assets.createdAt,
    })
    .from(assets)
    .where(eq(assets.documentId, documentId));

  return c.json(documentAssets);
});

const getAssetRoute = createRoute({
  method: "get",
  path: "/{documentId}/{assetId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
      assetId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/octet-stream": {
          schema: z.any(),
        },
      },
      description: "Asset file content",
    },
  },
  tags: ["Assets"],
});

assetsRouter.openapi(getAssetRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { documentId, assetId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.documentId, documentId)));

  if (!asset) {
    throw new NotFoundError("Asset not found");
  }

  const buffer = await storageService.getAsset(
    userId,
    documentId,
    asset.filename
  );

  logger.info({ userId, documentId, assetId }, "Asset retrieved");

  return new Response(buffer, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Content-Disposition": `inline; filename="${asset.filename}"`,
    },
  });
});

const deleteAssetRoute = createRoute({
  method: "delete",
  path: "/{documentId}/{assetId}",
  request: {
    params: z.object({
      documentId: z.string().uuid(),
      assetId: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Asset deleted successfully",
    },
  },
  tags: ["Assets"],
});

assetsRouter.openapi(deleteAssetRoute, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { documentId, assetId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.documentId, documentId)));

  if (!asset) {
    throw new NotFoundError("Asset not found");
  }

  try {
    await storageService.deleteAsset(userId, documentId, asset.filename);
  } catch (error) {
    logger.error(
      { error, documentId, assetId },
      "Failed to delete from R2 - continuing with DB deletion"
    );
  }

  await db.delete(assets).where(eq(assets.id, assetId));

  logger.info({ userId, documentId, assetId }, "Asset deleted");

  return c.body(null, 204);
});
