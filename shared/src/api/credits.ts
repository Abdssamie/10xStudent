import { z } from "zod";

export const creditsBalanceResponseSchema = z.object({
  balance: z.number(),
  creditsResetAt: z.string().datetime(),
  usedThisMonth: z.number(),
});

export const creditLogResponseSchema = z.object({
  id: z.string().uuid(),
  operation: z.string(),
  cost: z.number(),
  tokensUsed: z.number().nullable(),
  timestamp: z.string().datetime(),
});

export const creditsHistoryResponseSchema = z.object({
  logs: z.array(creditLogResponseSchema),
  hasMore: z.boolean(),
  cursor: z.string().uuid().optional(),
});
