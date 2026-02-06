// Export all schemas from the correct index file
export * from "./schema/index";
export * as schema from "./schema/index";
export * from "./client";

// Re-export commonly used drizzle operators for version consistency
export { eq, and, or, sql, desc, asc, isNull } from "drizzle-orm";
