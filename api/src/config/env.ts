/**
 * Environment variable validation and configuration
 * Uses Zod for runtime validation of environment variables
 */

import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.url(),

  // Clerk Authentication
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.url().optional(),

  // Voyage AI
  VOYAGEAI_API_KEY: z.string().min(1),

  // Google AI (optional, kept for backward compatibility)
  GOOGLE_API_KEY: z.string().min(1).optional(),

  // Firecrawl
  FIRECRAWL_API_KEY: z.string().min(1).optional(),

  // Server
  PORT: z
    .string()
    .default("3000")
    .transform(Number)
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Validate environment variables at startup
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables:");
  console.error(result.error.message);
  throw new Error("Invalid environment variables");
}

// Export typed environment variables
export const env = result.data;

// Type inference for TypeScript
export type Env = z.infer<typeof envSchema>;
