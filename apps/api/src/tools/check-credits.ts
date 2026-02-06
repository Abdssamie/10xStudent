import { z } from "zod";
import { db, schema, eq } from "@10xstudent/database";

const { users } = schema;

export const checkCreditsSchema = z.object({
  userId: z.string().uuid(),
  estimatedCost: z.number().min(0),
});

export async function checkCreditsTool(
  params: z.infer<typeof checkCreditsSchema>,
): Promise<{ credits: number; hasEnough: boolean; shortfall: number }> {
  const [user] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, params.userId));

  if (!user) {
    throw new Error("User not found");
  }

  const hasEnough = user.credits >= params.estimatedCost;

  return {
    credits: user.credits,
    hasEnough,
    shortfall: hasEnough ? 0 : params.estimatedCost - user.credits,
  };
}
