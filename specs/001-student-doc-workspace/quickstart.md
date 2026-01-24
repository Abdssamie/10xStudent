# Quickstart: Student Document Workspace

## Prerequisites

- Node.js 18+ / Bun 1.0+
- Docker & Docker Compose
- Clerk Account (Dev)
- Cloudflare R2 Bucket (or MinIO local)

## Setup

1. **Environment Variables**
   Copy `.env.example` to `.env`:

   ```bash
   DATABASE_URL=postgresql://...
   CLERK_SECRET_KEY=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   ```

2. **Start Services**

   ```bash
   docker-compose up -d postgres typst-api
   ```

   _(Note: `typst-api` is optional if using WASM, but good for robust rendering)_

3. **Install Dependencies**

   ```bash
   bun install
   ```

4. **Database Migration**

   ```bash
   bun run db:push
   ```

5. **Run Development Server**
   ```bash
   bun run dev
   ```

## Verification

1. Visit `http://localhost:3000/workspace`
2. Sign in with Clerk (Test Mode).
3. Create a new Resume.
4. Verify the preview pane loads (WASM initialization).
5. Type YAML and check for live updates.
