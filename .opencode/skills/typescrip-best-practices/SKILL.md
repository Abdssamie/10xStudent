---
name: typescript-best-practices
description: Best practices for TypeScript development including type safety, generics, type guards, utility types, and strict mode configuration.

---

# TypeScript Best Practices

Comprehensive guide for writing type-safe, maintainable, and robust TypeScript code. This skill covers type safety patterns, type guards, generics, utility types, and common pitfalls to avoid.

## When to Use

- When writing new TypeScript code
- When refactoring JavaScript to TypeScript
- When reviewing TypeScript code for type safety
- When debugging type-related issues
- When configuring TypeScript projects

## Core Principles

### 1. Enable Strict Mode

**CRITICAL: Always enable strict mode in tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

These flags catch common errors at compile time:

- `strict`: Enables all strict type checking options
- `noUncheckedIndexedAccess`: Treats indexed access as potentially undefined
- `noImplicitOverride`: Requires explicit `override` keyword
- `noPropertyAccessFromIndexSignature`: Prevents accessing properties via dot notation on index signatures

### 2. Type Inference

#### Let TypeScript Infer When Possible

```typescript
// ❌ BAD: Redundant type annotation
const count: number = 5;
const name: string = "John";

// ✅ GOOD: Let TypeScript infer
const count = 5;
const name = "John";
```

#### Explicitly Type Function Returns

```typescript
// ❌ BAD: No return type
function add(a: number, b: number) {
  return a + b;
}

// ✅ GOOD: Explicit return type
function add(a: number, b: number): number {
  return a + b;
}
```

#### Type Complex Objects

```typescript
// ✅ GOOD: Define interfaces for complex objects
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function getUser(id: string): User {
  // ...
}
```

### 3. Type Guards

Type guards allow TypeScript to narrow types within conditional blocks.

#### typeof Type Guards

```typescript
function processValue(value: string | number) {
  if (typeof value === "string") {
    // TypeScript knows value is string here
    return value.toUpperCase();
  } else {
    // TypeScript knows value is number here
    return value.toFixed(2);
  }
}
```

#### instanceof Type Guards

```typescript
function handleError(error: Error | string) {
  if (error instanceof Error) {
    // TypeScript knows error is Error here
    console.error(error.message);
    console.error(error.stack);
  } else {
    // TypeScript knows error is string here
    console.error(error);
  }
}
```

#### User-Defined Type Guards

```typescript
// ✅ GOOom type guard with type predicate
interface User {
  id: string;
  name: string;
}

interface Admin extends User {
  permissions: string[];
}

function isAdmin(user: User | Admin): user is Admin {
  return 'permissions' in user;
}

function handleUser(user: User | Admin) {
  if (isAdmin(user)) {
    // TypeScript knows user is Admin here
    console.log(user.permissions);
  } else {
    // TypeScript knows user is User here
    console.log(user.name);
  }
}
```

#### Array.isArray Type Guard

```typescript
function processInput(input: string | string[]) {
  if (Array.isArray(input)) {
    // TypeScript knows input is string[] here
    return input.map(s => s.toUpperCase());
  } else {
    // TypeScript knows input is string here
    return input.toUpperCase();
  }
}
```

### 4. Union Types and Type Narrowing

#### Discriminated Unions

```typescript
// ✅ GOOD: Discriminated union pattern
type Success = {
  status: 'success';
  data: unknown;
};

type Error = {
  status: 'error';
  error: string;
};

type Result = Success | Error;

function handleResult(result: Result) {
  if (result.status === 'success') {
    // TypeScript knows result is Success
    console.log(result.data);
  } else {
    // TypeScript knows result is Error
    console.error(result.error);
  }
}
```

#### Exhaustive Type Checking

```typescript
// ✅ GOOD: Exhaustive checking with never
type Shape = 
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.size ** 2;
    case 'rectangle':
      return shape.shape.height;
    default:
      // This ensures all cases are handled
      const _exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${_exhaustive}`);
  }
}
```

### 5. Generics

#### Generic Functions

```typescript
// ✅ GOOD: Generic function for type safety
function identity<T>(value: T): T {
  return value;
}

const num = identity(5); // Type: number
const str = identity("hello"); // Type: string
```

#### Generic Constraints

```typescript
// ✅ GOOD: Constrain generics
interface HasId {
  id: string;
}

function findById<T extend(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}
```

#### Generic Interfaces

```typescript
// ✅ GOOD: Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface User {
  id: string;
  name: string;
}

const response: ApiResponse<User> = {
  data: { id: '1', name: 'John' },
  status: 200,
  message: 'Success'
};
```

### 6. Utility Types

TypeScript provides built-in utility types for common transformations.

#### Partial<T>

Makes all properties optional.

```typescript
interface User {
  id: stg;
  name: string;
  email: string;
}

// ✅ GOOD: Use Partial for updates
function updateUser(id: string, updates: Partial<User>) {
  // can have any subset of User properties
}

updateUser('1', { name: 'Jane' }); // Valid
```

#### Required<T>

Makes all properties required.

```typescript
interface Config {
  host?: string;
  port?: number;
}

// ✅ GOOD: Ensure all properties are provided
function initializeServer(config: Required<Config>) {
  // config.host and config.port are guaranteed to exist
}
```

#### Pick<T, K>

Creates a type with only specified properties.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// ✅ GOOD: Pick only public properties
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
```

#### Omit<T, K>

Creates a type without specified properties.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// ✅ GOOD: Omit sensitive properties
type SafeUser = Omit<User, 'password'>;
```

#### Record<K, T>

Creates an object type with specified keys and value type.

```typescript
// ✅ GOOD: Type-safe key-value mapping
type Role = 'admin' | 'user' | 'guest';

const permissions: Record<Role, string[]> = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write'],
  guest: ['read']
};
```

#### ReturnType<T>

Extracts the return type of a function.

```typescript
function getUser() {
  return {
    id: '1',
    name: 'John',
    email: 'john@example.com'
  };
}

// ✅ GOOD: Infer return type
type User = ReturnType<typeof getUser>;
```

### 7. Unknown vs Any

#### Prefer unknown Over any

```typescript
// ❌ BAD: Using any disables type checking
function processData(data: any) {
  return data.toUpperCase(); // No error, but might crash
}

// ✅ GOOD: Use unknown and type guard
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase(); // Safe
  }
  throw new Error('Invalid data type');
}
```

#### When to Use any

Only use `any` when:

- Migrating JavaScript to TypeScript incrementally
- Dealing with truly dynamic data where types cannot be known
- Working with third-party libraries without types

Always add a comment explaining why `any` is necessary.

```typescript
// ✅ ACCEPTABLE: Documented any usage
// Using any because third-party library lacks type definitions
const result: any = legacyLibrary.getData();
```

### 8. Null and Undefined Handling

#### Use Optional Chaining

```typescript
// ❌ BAD: Manual null checks
if (user && user.address && user.address.city) {
  console.log(user.address.city);
}

// ✅ GOOD: Optional chaining
console.log(user?.address?.city);
```

#### Use Nullish Coalescing

```typescript
// ❌ BAD: Using || can have unexpected behavior
const port = config.port || 3000; // 0 would be replaced with 3000

// ✅ GOOD: Nullish coalescing only for null/undefined
const port = config.port ?? 3000; // 0 would be preserved
```

#### Non-Null Assertion (Use Sparingly)

```typescript
// ⚠️ USE CAREFULLY: Only when you're certain value exists
const element = document.getElementById('app')!;

// ✅ BETTER: Handle null case
const element = document.getElementById('app');
if (!element) {
  throw new Error('Element not found');
}
```

### 9. Type Assertions

#### Use Type Assertions Sparingly

```typescript
// ❌ BAD: Unnecessary type assertion
const name = "John" as string;

// ⚠️ USE CAREFULLY: When you know more than TypeScript
const input = document.getElementById('input') as HTMLInputElement;

// ✅ BETTER: Use type guards
const input = document.getElementById('input');
if (input instanceof HTMLInputElement) {
  console.log(input.value);
}
```

#### as const for Literal Types

```typescript
// ❌ BAD: Widened to string[]
const colors = ['red', 'green', 'blue'];

// ✅ GOOD: Readonly tuple with literal types
const colors = ['red', 'green', 'blue'] as const;
// Type: readonly ["red", "green", "blue"]
```

### 10. Enums vs Union Types

#### Prefer Union Types Over Enums

```typescript
// ❌ AVOID: Enums generate runtime code
enum Status {
  Pending = 'pending',
  Active = 'active',
  Inactive = 'inactive'
}

// ✅ GOOD: Union types are zero-cost
type Status = 'pending' | 'active' | 'inactive';

// ✅ GOOD: With const object for values
const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

type Status = typeof STATUS[keyof typeof STATUS];
```

### 11. Function Overloads

Use function overloads for different parameter combinations.

```typescript
// ✅ GOOD: Function overloads
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: 'input'): HTMLInputElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const div = createElement('div'); // Type: HTMLDivElement
const span = crlement('span'); // Type: HTMLSpanElement
```

### 12. Readonly and Immutability

#### Use readonly for Immutable Data

```typescript
// ✅ GOOD: Readonly properties
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

// ✅ GOOD: Readonly arrays
function processItems(items: readonly string[]) {
  // items.push('new'); // Error: Cannot modify readonly array
  return items.map(item => item.toUpperCase());
}
```

#### ReadonlyArray and ReadonlyMap

```typescript
// ✅ GOOD: Readonly collections
type Items = ReadonlyArray<string>;
type Cache = ReadonlyMap<string, number>;
```

### 13. Type vs Interface

#### When to Use Interface

- Defining object shapes
- When you need declaration merging
- Public APIs

```typescript
// ✅ GOOD: Interface for object shapes
interface User {
  id: string;
  name: string;
}

// Declaration merging works with interfaces
interface User {
  email: string;
}
```

#### When to Use Type

- Union types
- Intersection types
- Mapped types
- Tuple types

```typescript
// ✅ GOOD: Type for unions
type Status = 'pending' | 'active' | 'inactive';

// ✅ GOOD: Type for intersections
type Admin = User & { permissions: string[] };

// ✅ GOOD: Type for mapped types
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

## Common Anti-Patterns to Avoid

### 1. Using any Unnecessarily

```typescript
// ❌ BAD: Disabling type safety
function processData(data: any) {
  return data.value;
}

// ✅ GOOD: Use proper types
function processData<T extends { value: unknown }>(data: T) {
  return data.value;
}
```

### 2. Type Assertions Instead of Type Guards

```typescript
// ❌ BAD: Unsafe type assertion
function getLength(value: unknown) {
  return (value as string).length;
}

// ✅ GOOD: Type guard
function getLength(value: unknown): number {
  if (typeof value === 'string') {
    return value.length;
  }
  throw new Error('Value is not a string');
}
```

### 3. Ignoring Compiler Errors with @ts-ignore

```typescript
// ❌ BAD: Suppressing errors
// @ts-ignore
const result = dangerousOperation();

// ✅ GOOD: Fix the underlying issue or use proper types
const result = dangerousOperation() as ExpectedType;
```

### 4. Not Handling Null/Undefined

```typescript
// ❌ BAD: Assuming value exists
function getUserName(user: User | null) {
  return user.name; // Error with strictNullChecks
}

// ✅ GOOD: Handle null case
function getUserName(user: User | null): string {
  return user?.name ?? 'Unknown';
}
```

## TypeScript Configuration Best Practices

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Type Safety Checklist

- [ ] Strict mode is enabled in tsconfig.json
- [ ] Function return types are explicitly typed
- [ ] Unknown is used instead of any where possible
- [ ] Type guards are used for narrowing types
- [ ] Nulined are handled explicitly
- [ ] Discriminated unions are used for complex types
- [ ] Utility types are leveraged for transformations
- [ ] Readonly is used for immutable data
- [ ] Generics are used for reusable type-safe code
- [ ] Type assertions are minimized and justified

## Additional Resources

- TypeScript Official Documentation: https://www.typescriptlang.org/docs/
- TypeScript Deep Dive: https://basarat.gitbook.io/typescript/
- Type Challenges: https://github.com/type-challenges/type-challenges

## Questions to Ask

When implementing TypeScript features, consider asking the user:

- "Should we enable additional strict flags in tsconfig.json?"
- "Do you want to generate type declarations for this library?"
- "Should we create custom type guards for this domain model?"
- "What's the expected behavior when values are null or undefined?"