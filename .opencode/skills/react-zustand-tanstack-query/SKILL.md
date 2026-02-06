---
name: react-zustand-tanstack-query
description: Guidelines for using Zustand for client state and TanStack Query v5 for server state in React applications, following React Rules and official documentation
---

# React State Management: Zustand + TanStack Query

## Overview

**Separation of concerns:** Use Zustand for client/UI state and TanStack Query v5 for server state. This pattern maintains clear boundaries and follows React's Rules.

**CRITICAL:** This skill provides principles and links to official documentation. Always refer to official docs for implementation details. Complex patterns (like auto-save, optimistic updates, state synchronization) require careful architecture and should be validated against React Rules before implementation.

## When to Use This Skill

- When deciding between Zustand and TanStack Query for state management
- When integrating client state with server state
- When reviewing code for proper state management separation
- Before implementing any state management pattern

## Core Principles

### Separation of Concerns

| Concern          | Tool           | Examples                               | Why                                        |
| ---------------- | -------------- | -------------------------------------- | ------------------------------------------ |
| **Client State** | Zustand        | Theme, modals, form drafts, UI toggles | Local to the app, doesn't need server sync |
| **Server State** | TanStack Query | API data, user profiles, documents     | Comes from server, needs caching and sync  |

**Rule:** Never store server data in Zustand. Never store UI state in TanStack Query.

### React Rules Compliance

Both Zustand and TanStack Query must follow the Rules of React:

1. **Components and Hooks must be pure** - No side effects during render
2. **React calls components and hooks** - Never call component functions directly
3. **Rules of Hooks** - Only call Hooks at top level

**CRITICAL:** Calling `setState` inside `useEffect` with dependencies that trigger on every render violates React purity and causes bugs. See Anti-Patterns section below.

## Zustand

**Official Documentation:** https://zustand.docs.pmnd.rs/

### What Zustand Is For

- UI state (theme, sidebar open/closed, modal visibility)
- Form drafts (unsaved form data)
- Client-only state (doesn't need server persistence)
- Temporary state (shopping cart before checkout)

### Basic Pattern

```tsx
import { create } from "zustand";

interface State {
  count: number;
  increment: () => void;
}

const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Usage in component
function Counter() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

### Middleware

Zustand provides middleware for common needs:

- **`devtools`** - Redux DevTools integration
- **`persist`** - LocalStorage/SessionStorage persistence
- **`immer`** - Immutable state updates with mutable syntax

**See official docs for middleware usage:** https://zustand.docs.pmnd.rs/guides/typescript#middleware-that-doesn't-change-the-store-type

## TanStack Query v5

**Official Documentation:** https://tanstack.com/query/v5/docs/framework/react/overview

### What TanStack Query Is For

- Fetching data from APIs
- Caching server responses
- Background refetching
- Optimistic updates
- Mutations (POST, PUT, DELETE)

### Basic Patterns

**Queries (GET):**

```tsx
import { useQuery } from '@tanstack/react-
function Users() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{data.map(user => <div key={user.id}>{user.name}</div>)}</div>;
}
```

**Mutations (POST, PUT, DELETE):**

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <button onClick={() => mutation.mutate({ name: "John" })}>
      Create User
    </button>
  );
}
```

**See official docs for:**

- Query invalidation: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
- Mutations: https://tanstack.com/query/v5/docs/framework/react/guides/mutations
- Optimistic updates: https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates

## Integration Guidelines

### Keep Them Separate

**Good:**

```tsx
// Zustand for UI state
coseUIStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// TanStack Query for server data
function Users() {
  const { data } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return <div>{/* render users */}</div>;
}
```

**Bad:**

```tsx
// ❌ DON'T store server data in Zustand
const useStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const data = await api.getUsers();
    set({ users: data }); // ❌ Duplicates TanStack Query's job
  },
}));
```

### Use Controlled Components for Forms

When building forms that need both local state and server sync:

1. Use React's `useState` for form fields (controlled components)
2. Use TanStack Query's `useMutation` for submission
3. Optionally use Zustand for form drafts (if needed across components)

**See React docs on controlled components:** https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable

## Anti-Patterns and Common Mistakes

### ❌ CRITICAL: Calling setState in useEffect

\*\*This pattern is FUNDAMENTALLY FLAWED and violates React Rul

```tsx
// ❌ WRONG - Violates React purity, causes infinite loops
function Editor() {
  const { content, setContent } = useEditorStore();
  const { data } = useQuery({ queryKey: ["doc"], queryFn: fetchDoc });

  useEffect(() => {
    if (data?.content) {
      setContent(data.content); // ❌ setState in effect = side effect during render
    }
  }, [data?.content]); // ❌ Triggers on every render

  return (
    <textarea value={content} onChange={(e) => setContent(e.target.value)} />
  );
}
```

**Why this is wrong:**

1. Violates React's purity rules (side effects during render)
2. Creates race conditions between user input and server data
3. Causes infinite loops when dependencies change
4. Makes React Compiler unable to optimize

**Correct approach:**

- Let TanStack Query manage server state
- Let React's `useState` manage form state
- Use controlled components
- Submit changes via mutations

```tsx
// ✅ CORRECT - Let each tool do its job
function Editor() {
  const [content, setContent] = useState('');
  const { data } = useQuery({ queryKey: ['doc'], queryFn: fetchDoc });

  // Initialize once when data loads
  useEffect(() => {
    if (data?ent && content === '') {
      setContent(data.content);
    }
  }, [data?.content]); // Only runs when data first loads

  const mutation = useMutation({
    mutationFn: (newContent: string) => saveDoc(newContent),
  });

  return (
    <>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={() => mutation.mutate(content)}>Save</button>
    </>
  );
}
```

### ❌ Auto-Save Patterns

**WARNING:** Auto-save patterns are complex and error-prone. The previous version of this skill contained fundamentally flawed auto-save examples that:

1. Called `setState` in `useEffect` (violates React Rules)
2. Debounced content values (creates stale data)
3. Synced between Zustand and TanStack Query (race conditions)
4. Caused infinite loops and data loss

**If you need auto-save:**

1. Consult TanStack Query's mutation documentation
2. Validate your approach against React Rules
3. Test thoroughly for race conditions
4. Consider using form libraries (React Hook Form, Formik) that handle this correctly

**DO NOT implement auto-save patterns without thorough understanding of React Rules and async state management.**

### ❌ State Synchronization

**Don't manually sync between Zustand and TanStack Query:**

```tsx
// ❌ WRONG - Creates race conditions
useEffect(() => {
  if (queryData && !isDirty) {
    setZustandState(queryData); // ❌ Manual sync = bugs
  }
}, [queryData, isDirty]);
```

**Why this is wrong:**

- Query data can be stale after mutations
- `isDirty` flag creates complex state dependencies
- Race conditions between user input and refetches
- Violates single source of truth principle

**Correct approach:** Pick ONE source of truth and stick with it. Don't sync between them.

### ❌ Storing Server Data in Zustand

```tsx
// ❌ WRONG
const useStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const data = await api.getUsers();
    set({ users: data }); // ❌ Duplicates TanStack Query's caching
  },
}));
```

**Why this is wrong:**

- Duplicates TanStack Query's caching logic
- No automatic refetching or invalidation
- No loading/error states
- No background updates

**Correct approach:** Use TanStack Query for all server data.

### ❌ Debouncing Values Instead of Actions

```tsx
// ❌ WRONG - Debounced value is stale
const [debouncedContent] = useDebounce(content, 2000);
useEffect(() => {
  saveMutation.mutate(debouncedContent); // ❌ Saves stale data
}, [debouncedContent]);
```

**Why this is wrong:**

- `debouncedContent` is always 2 seconds behind actual content
- Saves stale data, loses user changes
- Creates race conditions with user input

**Correct approach:** Debounce the action, not the value. Or use form libraries that handle this correctly.

## Key Takeaways

1. **Zustand = Client State** (UI, forms, local data)
2. **TanStack Query = Server State** (API data, caching, sync)
3. **Never mix them** - Keep clear separation of concerns
4. **Follow React Rules** - No setState in useEffect with render dependencies
5. \*\*Use off - Don't trust complex patterns without validation
6. **Avoid auto-save** - It's harder than it looks, use form libraries
7. **One source of truth** - Don't sync between Zustand and TanStack Query

## Official Documentation

- **Zustand:** https://zustand.docs.pmnd.rs/
- **TanStack Query v5:** https://tanstack.com/query/v5/docs/framework/react/overview
- **React Rules:** https://react.dev/reference/rules
- **React Fundamentals:** Use the `react-fundamentals` skill

## When in Doubt

1. Check if it follows React Rules (use `react-fundamentals` skill)
2. Consult official documentation
3. Test for race conditions and infinite loops
4. Consider using established form libraries instead of custom patterns
