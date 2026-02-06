import { Hono } from "hono";
import { Webhook } from "svix";
import { db, schema } from "@10xstudent/database";

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

  // Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

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

  // Handle verified event
  if (event.type === "user.created") {
    const userId = event.data.id;

    await db.insert(users).values({
      id: userId,
      credits: 10000,
      preferences: {
        defaultCitationFormat: "APA",
        defaultResearchDepth: "quick",
      },
      creditsResetAt: new Date(),
    });

    return c.json({ success: true });
  }

  return c.json({ success: true });
});
