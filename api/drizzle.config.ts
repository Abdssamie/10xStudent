import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export default defineConfig({
  schema: "./src/database/schema/index.ts",
  out: "./.drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
