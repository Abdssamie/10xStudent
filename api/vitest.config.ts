import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/integration.setup.ts"],
    testTimeout: 30000, // 30s for container operations
    hookTimeout: 60000, // 60s for setup/teardown
    fileParallelism: false, // Run test files sequentially to avoid database conflicts
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
