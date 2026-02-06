import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * @id: check-credits-tool-def
 * @priority: high
 * @progress: 100
 * @directive: Define TanStack AI tool schema for checking user credit balance
 * @context: specs/02-tanstack-ai-llm-integration.md#tool-definitions
 * @checklist: [
 *   "✅ Define toolDefinition with name 'checkCredits'",
 *   "✅ Add inputSchema (empty - uses authenticated userId)",
 *   "✅ Add outputSchema with hasCredits, currentBalance, estimatedCost",
 *   "✅ Add description for checking credit balance",
 *   "✅ Mark as server tool (executes on server)",
 *   "✅ Export tool definition for use in /api/chat"
 * ]
 * @deps: []
 * @skills: ["tanstack-ai", "zod", "typescript"]
 */

export const checkCreditsDef = toolDefinition({
  name: "checkCredits",
  description:
    "Check if user has sufficient credits for an operation (uses authenticated user from session)",
  inputSchema: z.object({
    estimatedTokens: z
      .number()
      .optional()
      .describe("Estimated tokens for the operation (optional)"),
  }),
  outputSchema: z.object({
    hasCredits: z.boolean().describe("Whether user has sufficient credits"),
    currentBalance: z.number().describe("User's current credit balance"),
    estimatedCost: z.number().optional().describe("Estimated cost in credits"),
  }),
});
