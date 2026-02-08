import { Hono } from "hono";
import { Webhook } from "svix";
import { db, schema, eq } from "@/database";

const { users } = schema;

export const webhooksRouter = new Hono();

webhooksRouter.post("/clerk", async (c) => {
  // Get webhook signature headers
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: "Missing webhook signature headers" }, 400);
  }

  // Get raw body
  const body = await c.req.text();

  // Verify webhook signature using CLERK_WEBHOOK_SIGNING_SECRET
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET not configured");
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  const wh = new Webhook(webhookSecret);

  let event;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as any;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  // Handle user.created and user.updated with upsert
  if (event.type === "user.created" || event.type === "user.updated") {
    const userId = event.data.id;

    // Use upsert pattern: try insert, on conflict update
    try {
      await db
        .insert(users)
        .values({
          id: userId,
          credits: 10000,
          preferences: {
            defaultCitationFormat: "APA",
            defaultResearchDepth: "quick",
          },
          creditsResetAt: new Date(),
        })
        .onConflictDoNothing(); // On user.updated, keep existing data
    } catch (err) {
      console.error("Failed to sync user:", err);
      // Return 500 to trigger Svix retry
      return c.json({ error: "Failed to sync user" }, 500);
    }

    return c.json({ success: true });
  }

  // Handle user.deleted
  if (event.type === "user.deleted") {
    const userId = event.data.id;

    try {
      await db.delete(users).where(eq(users.id, userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
      return c.json({ error: "Failed to delete user" }, 500);
    }

    return c.json({ success: true });
  }

  // Return 200 for unhandled events (don't trigger retries)
  return c.json({ success: true });
});
