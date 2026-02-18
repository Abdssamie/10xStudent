// Test setup for API tests
// DATABASE_URL and REDIS_URL are set by integration.setup.ts (TestContainers)
// But we need placeholder values here for module imports that validate env vars

// Set other required environment variables for tests
process.env.NODE_ENV = "test";
process.env.CLERK_SECRET_KEY = "test_clerk_secret_key";
process.env.R2_ACCOUNT_ID = "test_account_id";
process.env.R2_ACCESS_KEY_ID = "test_access_key";
process.env.R2_SECRET_ACCESS_KEY = "test_secret_key";
process.env.R2_BUCKET_NAME = "test-bucket";
process.env.VOYAGEAI_API_KEY = "test_voyage_key";

// Set placeholder DATABASE_URL and REDIS_URL if not already set
// These will be overridden by integration.setup.ts with real container URLs
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://localhost:6379";
}

// IMPORTANT: Only set GOOGLE_API_KEY if not already set
// E2E tests need the real API key from .env
if (!process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = "test_google_key";
}

process.env.PORT = "3001";
