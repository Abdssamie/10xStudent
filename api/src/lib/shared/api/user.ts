import { z } from "zod";
import { citationFormatSchema, type CitationFormat } from "../document";

export { citationFormatSchema };
export type { CitationFormat };

export const userPreferencesSchema = z.object({
  defaultCitationFormat: citationFormatSchema,
});

export const userSettingsResponseSchema = z.object({
  id: z.string().uuid(),
  credits: z.number(),
  preferences: userPreferencesSchema.nullable(),
  creditsResetAt: z.string().datetime(),
});

export const updateUserPreferencesRequestSchema = z.object({
  defaultCitationFormat: citationFormatSchema.optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
export type UpdateUserPreferencesRequest = z.infer<typeof updateUserPreferencesRequestSchema>;
