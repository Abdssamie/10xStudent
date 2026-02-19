import { z } from "zod";

export const userCitationFormatSchema = z.enum(["APA", "MLA", "Chicago"]);

export const userPreferencesSchema = z.object({
  defaultCitationFormat: userCitationFormatSchema,
});

export const userSettingsResponseSchema = z.object({
  id: z.string().uuid(),
  credits: z.number(),
  preferences: userPreferencesSchema.nullable(),
  creditsResetAt: z.string().datetime(),
});

export const updateUserPreferencesRequestSchema = z.object({
  defaultCitationFormat: userCitationFormatSchema.optional(),
});
