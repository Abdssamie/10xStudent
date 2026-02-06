---
name: zod-v4-best-practices
description: Best practices for Zod v4 schema validation including type inference, schema composition, error handling, refinements, and transforms.

---

# Zod v4 Best Practices

Comprehensive guide for using Zod v4, a TypeScript-first schema validation library.

## When to Use

- When validating API request/response data
- When parsing user input or form data
- When ensuring type safety at runtime
- When defining data contracts between systems
- When validating environment variables or configuration

## Core Principles

### 1. Always Use Type Inference

```typescript
// Good: Infer types from schemas
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof userSchema>;

// Bad: Manually defining duplicate types
interface User {
  id: string;
  name: string;
  email: string;
}
```

### 2. Prefer safeParse Over parse

```typescript
// Good: Use safeParse to avoid try/catch
const result = userSchema.safeParse(data);

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.issues);
}

// Bad: Unhandled parse can throw
const user = userSchema.parse(data);
```

### 3. Validate at System Boundaries

```typescript
// Good: Validate external data
function handleApiRequest(req: Request) {
  const result = requestSchema.safeParse(req.body);
  if (!result.success) {
    return { error: result.error };
  }
  return processData(result.data);
}
```

### 4. Use Discriminated Unions

```typescript
// Good: Discriminated unions for complex types
const resultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.unknown() }),
  z.object({ status: z.literal('error'), error: z.string() }),
]);
```

### 5. Schema Composition

```typescript
// Good: Extend and compose schemas
const baseSchema = z.object({ id: z.string() });
const extendedSchema = baseSchema.extend({ name: z.string() });

// Pick and omit
const publicSchema = userSchema.omit({ password: true });
```

### 6. Custom Validation with Refinements

```typescript
// Good: Add custom validation
const passwordSchema = z.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), 'Must contain uppercase')
  .refine(val => /[0-9]/.test(val), 'Must contain number');
```

### 7. Transforms for Data Normalization

```typescript
// Good: Transform data during parsing
const envSchema = z.object({
  PORT: z.string().transform(Number).pipe(z.number().positive()),
});
```

## Common Patterns

### API Request Validation

```typescript
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().max(150),
});

function createUser(req: Request) {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return { error: result.error.issues };
  }
  return saveUser(result.data);
}
```

### Environment Variables

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
});

const env = envSchema.parse(process.env);
```

## Anti-Patterns to Avoid

1. Using .any() - Defeats the purpose of validation
2. Not handling errors - Always use safeParse or try/catch
3. Manual type definitions - Use z.infer instead
4. Trusting external data - Always validate at boundaries

## Zod v4 Features

- Significant performance improvements
- Reduced TypeScript compilation times
- Zod Mini variant for smaller bundles
- Use .check() in Zod Mini instead of .refine()

## Questions to Ask

- Should we use strict validation or allow additional properties?
- What error messages should be shown to users?
- Do we need to transform the data after validation?
- Should we validate at the API boundary or deeper in the application?