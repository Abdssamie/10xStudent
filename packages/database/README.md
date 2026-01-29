# @xstudent/database

Shared database package for 10xStudent project.

## Contents

- **Schema**: Drizzle ORM schema definitions (students, documents, resources, API keys)
- **Migrations**: Database migration files
- **Validators**: Zod validation schemas
- **Client**: Database connection utilities
- **Store**: R2/S3 client utilities
- **Crypto**: API key encryption utilities

## Usage

```typescript
import { db, students, documents } from '@xstudent/database'

// Query database
const allStudents = await db.select().from(students)
```

## Scripts

- `bun run db:generate` - Generate migrations
- `bun run db:push` - Push schema to database
- `bun run db:studio` - Open Drizzle Studio
