# typst.ts Library Research

> Research findings for integrating [typst.ts](https://myriad-dreamin.github.io/typst.ts) into 10xStudent

## Overview

**typst.ts** (reflexo-typst) brings the Typst typesetting language to JavaScript, enabling:
- Client-side Typst compilation via WebAssembly
- Multiple output formats (SVG, PDF, Canvas, Vector)
- React integration for document rendering
- Incremental compilation for real-time preview

---

## Core Packages

| Package | Size | Purpose |
|---------|------|---------|
| `@myriaddreamin/typst.ts` | ~50KB | Core JS wrapper library |
| `@myriaddreamin/typst-ts-web-compiler` | ~7.6MB | WASM compiler module |
| `@myriaddreamin/typst-ts-renderer` | ~350KB | WASM renderer module |
| `@myriaddreamin/typst.react` | ~15KB | React component library |
| Default fonts bundle | ~4.4MB | Text, Math, Raw fonts |

**Total download:** ~12MB on first load (cacheable)

---

## Key APIs

### Basic Compilation

```typescript
import { $typst } from '@myriaddreamin/typst.ts';

// Configure WASM paths (required in browser)
$typst.setCompilerInitOptions({ 
  getModule: () => '/wasm/typst_ts_web_compiler_bg.wasm' 
});
$typst.setRendererInitOptions({ 
  getModule: () => '/wasm/typst_ts_renderer_bg.wasm' 
});

// Compile to different formats
const svg = await $typst.svg({ mainContent: '= Hello Typst!' });
const pdf = await $typst.pdf({ mainContent: '= Hello Typst!' });
const vector = await $typst.vector({ mainContent: '= Hello Typst!' });
```

### File Management

```typescript
// Add source files (templates, imports)
await $typst.addSource('/template.typ', templateContent);
await $typst.addSource('/refs.bib', bibContent);

// Add binary assets (images)
const imageData = await fetch('/image.png').then(r => r.arrayBuffer());
$typst.mapShadow('/assets/image.png', new Uint8Array(imageData));

// Clean up shadow files
$typst.resetShadow();
```

### React Integration

```tsx
import { TypstDocument } from '@myriaddreamin/typst.react';

// Configure renderer path
TypstDocument.setWasmModuleInitOptions({
  getModule: () => '/wasm/typst_ts_renderer_bg.wasm',
});

// Render document
export const Preview = ({ artifact }: { artifact: Uint8Array }) => (
  <TypstDocument fill="#1e1e2e" artifact={artifact} />
);
```

### Incremental Rendering

```typescript
// Compile to vector format (cacheable intermediate)
const vectorData = await $typst.vector({ mainContent });

// Render vector data without recompilation
await $typst.svg({ vectorData });
await $typst.canvas(containerElement, { vectorData });
```

---

## WASM Caching Strategy

### Problem
WASM modules are ~12MB total - need to avoid re-downloading on every page load.

### Solution: Multi-Layer Caching

#### 1. HTTP Cache Headers (Server/CDN)
```
Cache-Control: public, max-age=31536000, immutable
```

#### 2. Service Worker Pre-caching
```typescript
// service-worker.ts
const CACHE_NAME = 'typst-wasm-v1';
const WASM_ASSETS = [
  '/wasm/typst_ts_web_compiler_bg.wasm',
  '/wasm/typst_ts_renderer_bg.wasm',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(WASM_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/wasm/')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
```

#### 3. IndexedDB Cache (This is not planned now, Skip this. Service workers do the job)
```typescript
import { openDB } from 'idb';

async function loadWasmWithCache(url: string): Promise<ArrayBuffer> {
  const db = await openDB('typst-cache', 1, {
    upgrade(db) { db.createObjectStore('wasm'); }
  });
  
  const cached = await db.get('wasm', url);
  if (cached) return cached;
  
  const buffer = await fetch(url).then(r => r.arrayBuffer());
  await db.put('wasm', buffer, url);
  return buffer;
}
```

### Cache Flow
```
First Visit:
  Browser → fetch() → Network → Download WASM → Store in Cache

Subsequent Visits:
  Browser → fetch() → Cache Hit → Return instantly (no network)
```

---

## Architecture Mapping to Implementation Plan

| Plan Task | typst.ts Solution |
|-----------|-------------------|
| Task 13: CodeMirror + WASM | `$typst.svg()` with debounced onChange |
| Task 13: PDF export | `$typst.pdf()` one-liner |
| Task 13: Error parsing | Compiler returns line/column info |
| Task 16: Citation preview | Parse `@key` syntax, lookup in sources |
| Task 19: Remove server compilation | All handled in browser via WASM |

---

## Implementation Recommendations

### 1. Lazy Loading
Don't load WASM on initial page load. Load when user opens editor:
```typescript
const loadTypst = async () => {
  const { $typst } = await import('@myriaddreamin/typst.ts');
  // Initialize here
};
```

### 2. Debounced Compilation
```typescript
import { useDebouncedCallback } from 'use-debounce';

const compile = useDebouncedCallback(async (content: string) => {
  const svg = await $typst.svg({ mainContent: content });
  setPreview(svg);
}, 300);
```

### 3. Error Display
```typescript
try {
  await $typst.svg({ mainContent });
} catch (error) {
  // Error contains line/column for CodeMirror highlighting
  console.error(error.message); // "error at line 5, column 10: ..."
}
```

### 4. Font Strategy
- Use default embedded fonts for MVP
- Later: allow custom font uploads via `mapShadow()`

---

## Resources

- [typst.ts Documentation](https://myriad-dreamin.github.io/typst.ts)
- [GitHub Repository](https://github.com/Myriad-Dreamin/typst.ts)
- [React Demo](https://github.com/Myriad-Dreamin/typst.ts/tree/main/packages/typst.react/src/demo)
- [Single-file Preview Example](https://github.com/Myriad-Dreamin/typst.ts/blob/main/github-pages/preview.html)
