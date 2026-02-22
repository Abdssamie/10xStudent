import { Hono } from "hono";
import { schema, eq } from "@/infrastructure/db";
import { logger } from "@/utils/logger";
import { verifyWebhook } from "@clerk/backend/webhooks";

const { users } = schema;

const DEFAULT_USER_VALUES = {
  credits: 10000,
  preferences: {
    defaultCitationFormat: "APA",
    defaultResearchDepth: "quick",
  },
} as const;

export const webhooksRouter = new Hono();

webhooksRouter.all("/clerk", (c) => {
  if (c.req.method === "GET") {
    return c.json({ message: "Clerk webhook endpoint. Send POST requests only." });
  }
  return c.json({ error: "Method not allowed" }, 405);
});

webhooksRouter.post("/clerk", async (c) => {
  let event;
  try {
    event = await verifyWebhook(c.req.raw);
  } catch (err) {
    logger.error({ error: err }, "Webhook verification failed");
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  const services = c.get("services");
  const db = services.db;

  if (event.type === "user.created") {
    const clerkId = event.data.id;

    try {
      await db.insert(users).values({
        clerkId,
        ...DEFAULT_USER_VALUES,
      }).onConflictDoNothing({ target: users.clerkId });
    } catch (err) {
      logger.error({ error: err, clerkId, eventType: event.type }, "Failed to create user");
      return c.json({ error: "Failed to create user" }, 500);
    }

    return c.json({ success: true });
  }

  if (event.type === "user.updated") {
    const clerkId = event.data.id;

    try {
      await db.insert(users).values({
        clerkId,
        ...DEFAULT_USER_VALUES,
      }).onConflictDoUpdate({
        target: users.clerkId,
        set: { updatedAt: new Date() },
      });
    } catch (err) {
      logger.error({ error: err, clerkId, eventType: event.type }, "Failed to sync user");
      return c.json({ error: "Failed to sync user" }, 500);
    }

    return c.json({ success: true });
  }

  if (event.type === "user.deleted") {
    const clerkId = event.data.id;

    if (!clerkId) {
      logger.error("User ID missing in user.deleted event");
      return c.json({ error: "User ID missing" }, 400);
    }

    try {
      await db.delete(users).where(eq(users.clerkId, clerkId));
    } catch (err) {
      logger.error({ error: err, clerkId }, "Failed to delete user");
      return c.json({ error: "Failed to delete user" }, 500);
    }

    return c.json({ success: true });
  }

  logger.info({ eventType: event.type }, "Unhandled webhook event");
  return c.json({ success: true, handled: false });
});
