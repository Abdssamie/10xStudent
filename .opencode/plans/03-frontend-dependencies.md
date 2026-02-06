# Phase 3: Frontend Dependencies & Setup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install and configure frontend dependencies for CodeMirror editor, state management, server state, and authentication.

**Architecture:** Next.js 16 App Router with Clerk authentication, Zustand for UI state, TanStack Query v5 for server state, CodeMirror 6 for Typst editing.

**Tech Stack:** Next.js 16, CodeMirror 6, TanStack Query v5, Zustand, Clerk, TypeScript

---

## Prerequisites

- Phase 1 completed (Docker infrastructure)
- Phase 2 completed (Backend API endpoints)
- Node.js 18+ and Bun installed

---

## Task 1: Install CodeMirror 6

**Files:**

- Modify: `apps/web/package.json`

**Context:** CodeMirror 6 is the editor for Typst source code. We need core packages plus basic extensions.

**Step 1: Add CodeMirror dependencies**

Run in `apps/web`:

```bash
bun add codemirror @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/search @codemirror/autocomplete @codemirror/lint @codemirror/lang-markdown
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run: `bun run check-types`
Expected: No errors related to CodeMirror

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lockb
git commit -m "feat(web): add CodeMirror 6 dependencies"
```

---

## Task 2: Install TanStack Query v5

**Files:**

- Modify: `apps/web/package.json`

**Context:** TanStack Query manages server state (documents, sources, credits) with caching and automatic refetching.

**Step 1: Add TanStack Query**

Run in `apps/web`:

```bash
bun add @tanstack/react-query @tanstack/react-query-devtools
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run: `bun run check-types`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lockb
git commit -m "feat(web): add TanStack Query v5 for server state"
```

---

## Task 3: Install Zustand

**Files:**

- Modify: `apps/web/package.json`

**Context:** Zustand manages client-side UI state (editor state, sidebar visibility, theme).

**Step 1: Add Zustand**

Run in `apps/web`:

```bash
bun add zustand
```

Expected: Package installed successfully

**Step 2: Verify installation**

Run: `bun run check-types`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lockb
git commit -m "feat(web): add Zustand for UI state management"
```

---

## Task 4: Install Clerk Frontend SDK

**Files:**

- Modify: `apps/web/package.json`

**Context:** Clerk provides authentication UI components and hooks for Next.js.

**Step 1: Add Clerk Next.js SDK**

Run in `apps/web`:

```bash
bun add @clerk/nextjs
```

Expected: Package installed successfully

**Step 2: Verify installation**

Run: `bun run check-types`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lockb
git commit -m "feat(web): add Clerk authentication SDK"
```

---

## Task 5: Install TanStack AI (Client)

**Files:**

- Modify: `apps/web/package.json`

**Context:** TanStack AI client for AI chat integration with tool execution.

**Step 1: Add TanStack AI**

Run in `apps/web`:

```bash
bun add @tanstack/ai
```

Expected: Package installed successfully

**Step 2: Verify installation**

Run: `bun run check-types`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lockb
git commit -m "feat(web): add TanStack AI for chat integration"
```

---

## Task 6: Configure Clerk Provider

**Files:**

- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/middleware.ts`

**Context:** Wrap app with ClerkProvider and configure middleware for authentication.

**Step 1: Update root layout**

Modify `apps/web/app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '10xStudent - AI-Powered Document Creation',
  description: 'Create professional documents with AI assistance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Step 2: Create Clerk middleware**

Create `apps/web/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Step 3: Add Clerk environment variables**

Ensure `.env.local` has:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Step 4: Test Clerk setup**

Run: `bun run dev` (in apps/web)
Expected: App starts, Clerk middleware active

**Step 5: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/middleware.ts
git commit -m "feat(web): configure Clerk authentication provider"
```

---

## Task 7: Configure TanStack Query Provider

**Files:**

- Create: `apps/web/app/providers.tsx`
- Modify: `apps/web/app/layout.tsx`

**Context:** Set up TanStack Query with React Query DevTools for development.

**Step 1: Create providers component**

Create `apps/web/app/providers.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Step 2: Update root layout**

Modify `apps/web/app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '10xStudent - AI-Powered Document Creation',
  description: 'Create professional documents with AI assistance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Step 3: Test TanStack Query setup**

Run: `bun run dev`
Expected: App starts, React Query DevTools available (bottom-left icon)

**Step 4: Commit**

```bash
git add apps/web/app/providers.tsx apps/web/app/layout.tsx
git commit -m "feat(web): configure TanStack Query provider"
```

---

## Task 8: Create API Client Utility

**Files:**

- Create: `apps/web/lib/api-client.ts`

**Context:** Centralized API client with Clerk authentication token injection.

**Step 1: Create API client**

Create `apps/web/lib/api-client.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class APIError exte
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Authenticated API client for server components
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!responn    const error = await response.json().catch(() => ({}));
    throw new APIError(
      error.message || 'API request failed',
      response.status,
      error
    );
  }

  return response.json();
}

/**
 * Client-side API client (for use in client components)
 */
export async function clientApiClient<T>(
  endpoint: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new APIError(
      error.message || 'API request failed',
      response.status,
      error
    );
  }

  return response.json();
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/api-client.ts
git commit -m "feat(web): add API client utility with Clerk auth"
```

---

## Task 9: Create Zustand Stores

**Files:**

- Create: `apps/web/stores/editor-store.ts`
- Create: `apps/web/stores/ui-store.ts`

**Context:** Zustand stores for editor state and UI state management.

**Step 1: Create editor store**

Create `apps/web/stores/editor-store.ts`:

```typescript
import { create } from "zustand";

interface EditorState {
  content: string;
  cursorPosition: number;
  isDirty: boolean;
  lastSaved: Date | null;

  setContent: (content: string) => void;
  setCursorPosition: (position: number) => void;
  markDirty: () => void;
  markSaved: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  content: "",
  cursorPosition: 0,
  isDirty: false,
  lastSaved: null,

  setContent: (content) => set({ content, isDirty: true }),
  setCursorPosition: (position) => set({ curson: position }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, lastSaved: new Date() }),
}));
```

**Step 2: Create UI store**

Create `apps/web/stores/ui-store.ts`:

```typescript
import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  chatOpen: boolean;
  previewMode: "split" | "preview-only" | "editor-only";

  toggleSidebar: () => void;
  toggleChat: () => void;
  setPreviewMode: (mode: "split" | "preview-only" | "editor-only") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  chatOpen: false,
  previewMode: "split",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setPreviewMode: (mode) => set({ previewMode: mode }),
}));
```

**Step 3: Commit**

```bash
git add apps/web/stores/editor-store.ts apps/web/stores/ui-store.ts
git commit -m "feat(web): add Zustand stores for editor and UI state"
```

---

## Task 10: Create TanStack Query Hooks

**Files:**

- Create: `apps/web/hooks/use-documents.ts`
- Create: `apps/web/hoedits.ts`

**Context:** React Query hooks for fetching and mutating server data.

**Step 1: Create documents hooks**

Create `apps/web/hooks/use-documents.ts`:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { clientApiClient } from '@/lib/api-client';

interface Document {
  id: string;
  title: string;
  typstContent: string;
  template: string;
  citationFormat: string;
  createdAt: string;
  updatedAt: string;
}

export function useDocuments() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['document    queryFn: async () => {
      const token = await getToken();
      const data = await clientApiClient<{ documents: Document[] }>(
        '/documents',
        token
      );
      return data.documents;
    },
  });
}

export function useDocument(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['documents', id],
    queryFn: async () => {
      const token = await getToken();
      const data = await clientApiClient<{ document: Document }>(
        `/documents/${id}`,
        token
      return data.document;
 ,
    enabled: !!id,
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Document>;
    }) => {
      const token = await getToken();
      return clientApiClient<{ document: Document }>(
        `/documents/${id}`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.id] });
    },
  });
}
```

**Step 2: Create credits hooks**

Create `apps/web/hooks/use-credits.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { clientApiClient } from "@/lib/api-client";

export function useCredits() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      cken = await getToken();
      const data = await clientApiClient<{ credits: number }>(
        "/credits/balance",
        token,
      );
      return data.credits;
    },
  });
}
```

**Step 3: Commit**

```bash
git add apps/web/hooks/use-documents.ts apps/web/hooks/use-credits.ts
git commit -m "feat(web): add TanStack Query hooks for documents and credits"
```

---

## Verification Checklist

Before moving to Phase 4, verify:

- [ ] CodeMirror 6 packages installed
- [ ] TanStack Query v5 installed and configured
- [ ] Zustand installed with stores created
- [ ] Clerk SDK installed and configured
- [ ] TanStack AI installed
- [ ] API client utility created
- [ ] React Query hooks created
- [ ] App runs without errors: `bun run dev`
- [ ] All changes committed to git

---

## Next Steps

After completing Phase 3:

1. Proceed to Phase 4: `04-editor-preview-components.md`
2. Build CodeMirror editor component
3. Build PDF preview component
4. Implement auto-save and auto-compile
