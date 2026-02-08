// Test setup for API tests

// Set DATABASE_URL for tests (mocked database)
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
