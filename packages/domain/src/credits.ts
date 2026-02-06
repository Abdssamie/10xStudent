/**
 * @id: credits-constants
 * @priority: medium
 * @progress: 100
 * @directive: Define credit cost constants and helper functions
 * @context: specs/01-database-api-foundation.md#credit-system
 * @checklist: [
 *   "✅ Define CREDIT_COSTS object with operations and costs",
 *   "✅ TYPST_GENERATION: (tokens) => Math.ceil(tokens / 1000)",
 *   "✅ WEB_SEARCH: 1 credit",
 *   "✅ RAG_QUERY: 0 credits (free)",
 *   "✅ SAVE_DOCUMENT: 0 credits (free)",
 *   "✅ Define CreditOperation type",
 *   "✅ Export deductCredits helper function",
 *   "✅ Export getUserCredits helper function"
 * ]
 * @deps: []
 * @skills: ["typescript"]
 */

// Credit cost constants
export const CREDIT_COSTS = {
  TYPST_GENERATION: (tokens: number) => Math.ceil(tokens / 1000),
  WEB_SEARCH: 1,
  RAG_QUERY: 0,
  SAVE_DOCUMENT: 0,
} as const;

// Credit operation type
export type CreditOperation = keyof typeof CREDIT_COSTS;

// Initial credits for new users
export const INITIAL_CREDITS = 10000;

// Monthly credit reset amount
export const MONTHLY_CREDIT_RESET = 10000;

// Helper function to calculate cost for an operation
export function calculateCreditCost(
  operation: CreditOperation,
  params?: { tokens?: number },
): number {
  const costFn = CREDIT_COSTS[operation];

  if (typeof costFn === "function") {
    return costFn(params?.tokens || 0);
  }

  return costFn;
}

// Helper function to check if user has sufficient credits
export function hasSufficientCredits(
  userCredits: number,
  operation: CreditOperation,
  params?: { tokens?: number },
): boolean {
  const cost = calculateCreditCost(operation, params);
  return userCredits >= cost;
}
