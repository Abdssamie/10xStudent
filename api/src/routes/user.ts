import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

import {
  userSettingsResponseSchema,
  updateUserPreferencesRequestSchema,
  userPreferencesSchema,
} from "@shared/api/user";

import { schema } from "@/infrastructure/db";
import { NotFoundError } from "@/infrastructure/errors";

const { users } = schema;

export const userRouter = new OpenAPIHono();

const getUserSettingsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: userSettingsResponseSchema,
        },
      },
      description: "User settings and preferences",
    },
  },
  tags: ["User"],
});

userRouter.openapi(getUserSettingsRoute, async (c) => {
  console.log("[DEBUG] getUserSettingsRoute: handler started");
  const userContext = c.get("user");
  console.log("[DEBUG] getUserSettingsRoute: userContext =", userContext);
  const userId = userContext.id;
  console.log("[DEBUG] getUserSettingsRoute: userId =", userId);
  const services = c.get("services");
  const db = services.db;

  const [userRecord] = await db
    .select({
      id: users.id,
      credits: users.credits,
      preferences: users.preferences,
      creditsResetAt: users.creditsResetAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  console.log("[DEBUG] getUserSettingsRoute: userRecord =", userRecord);

  if (!userRecord) {
    throw new NotFoundError("User not found");
  }

  console.log("[DEBUG] getUserSettingsRoute: returning response");
  return c.json({
    id: userRecord.id,
    credits: userRecord.credits,
    preferences: userRecord.preferences,
    creditsResetAt: userRecord.creditsResetAt.toISOString(),
  });
});

const updateUserPreferencesRoute = createRoute({
  method: "patch",
  path: "/preferences",
  request: {
    body: {
      content: {
        "application/json": {
          schema: updateUserPreferencesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: userPreferencesSchema,
        },
      },
      description: "Updated user preferences",
    },
  },
  tags: ["User"],
});

userRouter.openapi(updateUserPreferencesRoute, async (c) => {
  const userContext = c.get("user");
  const userId = userContext.id;
  const services = c.get("services");
  const db = services.db;

  const body = c.req.valid("json");

  const [userRecord] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRecord) {
    throw new NotFoundError("User not found");
  }

  const currentPreferences = userRecord.preferences || {
    defaultCitationFormat: "APA" as const,
    defaultResearchDepth: "quick" as const,
  };

  const updatedPreferences = {
    defaultCitationFormat: body.defaultCitationFormat ?? currentPreferences.defaultCitationFormat,
    defaultResearchDepth: currentPreferences.defaultResearchDepth,
  };

  await db
    .update(users)
    .set({
      preferences: updatedPreferences,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return c.json(updatedPreferences);
});
