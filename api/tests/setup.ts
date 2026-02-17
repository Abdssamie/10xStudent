// Test setup for API tests
// DATABASE_URL is set by integration.setup.ts (TestContainers)

// Set other required environment variables for tests
process.env.NODE_ENV = "test";
process.env.CLERK_SECRET_KEY = "test_clerk_secret_key";
process.env.R2_ACCOUNT_ID = "test_account_id";
process.env.R2_ACCESS_KEY_ID = "test_access_key";
process.env.R2_SECRET_ACCESS_KEY = "test_secret_key";
process.env.R2_BUCKET_NAME = "test-bucket";
process.env.VOYAGEAI_API_KEY = "test_voyage_key";

// IMPORTANT: Only set GOOGLE_API_KEY if not already set
// E2E tests need the real API key from .env
if (!process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = "test_google_key";
}

process.env.PORT = "3001";
