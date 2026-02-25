# Handoff: Fix Typst Viewport Rendering

## Context
10xStudent is a WASM-based Typst editor. We attempted to optimize preview rendering by only rendering visible pages (viewport-based rendering), but the implementation caused 2GB+ RAM usage because the `window` option was being ignored.

## The Bug We Found

**Location:** `typst.ts` library's `renderSvg()` method ignores the `window` parameter entirely.

```typescript
// In typst.ts/packages/typst.ts/src/renderer.mts

// renderSvg() - IGNORES window! (lines 883-908)
renderSvg(options) {
  return this.renderer.svg_data(sessionRef[kObject], parts); // No window!
}

// renderSvgDiff() - USES window! (lines 910-928)
renderSvgDiff(options) {
  return this.renderer.render_svg_diff(
    sessionRef,
    options.window.lo.x, options.window.lo.y,
    options.window.hi.x, options.window.hi.y
  );
}
```

**Root cause:** `$typst.svg({ vectorData, window })` calls `renderSvg()` which ignores `window`. Viewport rendering only works with `renderSvgDiff()` which requires a persistent `RenderSession`.

## Files That Need Changes

All in `/home/abdssamie/ChemforgeProjects/10xStudent/web/src/`:

| File | Current State | Needed Change |
|------|---------------|---------------|
| `lib/typst-worker.ts` | Uses `$typst.svg({ vectorData, window })` | Use session-based `renderSvgDiff()` |
| `hooks/use-typst.ts` | Has `compileVector()` and `renderViewport()` | May need adjustment |
| `components/documents/editor.tsx` | Calls two-phase compile | May revert or adjust |
| `components/documents/document-preview.tsx` | Scroll-aware rendering | May revert or adjust |
| `utils/typst-svg-processor.ts` | Has `viewportMode` option | Keep or simplify |

## Two Options for Fix

### Option A: Use Session-Based renderSvgDiff (Complex but achieves viewport rendering)

Replace in `typst-worker.ts`:

```typescript
// BEFORE (broken):
const svg = await $typst.svg({ vectorData: cachedVectorData, window: msg.window });

// AFTER (correct):
const renderer = await $typst.getRenderer();
const svg = await renderer.runWithSession(
  { format: 'vector', artifactContent: cachedVectorData },
  async (session) => session.renderSvgDiff({ window: msg.window })
);
```

**Challenge:** Sessions are short-lived by design. Need to manage session lifecycle carefully or use the "leak session" pattern from docs.

### Option B: Revert to Simple Approach (Recommended - simpler, works)

Revert all viewport changes and go back to the original simple flow:

```typescript
// In typst-worker.ts - just compile to SVG directly
const svg = await $typst.svg({ mainContent: msg.source });
```

**Why this is better:**
- The original code worked fine
- Viewport optimization adds complexity for marginal gain
- 29-page doc renders in ~600ms which is acceptable
- Memory issue was caused by re-rendering full SVG on every scroll

## Original Working Code (Before Our Changes)

**typst-worker.ts** (original `compile` handler):
```typescript
if (msg.type === 'compile') {
  const svg = await $typst.svg({ mainContent: msg.source });
  self.postMessage({ type: 'result', id: msg.id, svg });
}
```

**editor.tsx** (original compile function):
```typescript
const compile = useDebouncedCallback(async (source, paperType) => {
  const result = await compiler.compile(compileContent);
  const processedSvg = processTypstSvg(result);
  setSvg(processedSvg);
}, 500);
```

**document-preview.tsx** (original - no scroll handling):
```typescript
<div dangerouslySetInnerHTML={{ __html: svg }} />
```

## Recommendation

**Go with Option B (revert).** The viewport optimization isn't worth the complexity because:

1. `renderSvgDiff()` requires managing session lifecycle in a Web Worker
2. Sessions can't easily be kept alive across multiple `postMessage` calls
3. The original implementation was fast enough (~600ms for 29 pages)
4. The memory issue was caused by our broken implementation, not the original

## To Implement Option B (Revert)

1. **typst-worker.ts**: Remove `compile-vector` and `render-viewport` handlers, keep only `compile`
2. **use-typst.ts**: Remove `compileVector()` and `renderViewport()` from interface, keep only `compile()`
3. **editor.tsx**: Revert to single `compile()` call, remove `pageInfo` state
4. **document-preview.tsx**: Revert to simple props (`svg`, `error`), remove scroll handling
5. **typst-svg-processor.ts**: Remove `viewportMode` option (optional cleanup)

## Key Files to Reference

- Original typst-worker.ts had only ~126 lines
- Current broken version has ~247 lines
- The diff shows exactly what was added

## Testing After Fix

1. Run `cd web && bun run dev`
2. Open a document with 20+ pages
3. Check browser memory stays under 500MB
4. Verify preview renders correctly
5. Verify scrolling works smoothly (no re-renders)

## Commands

```bash
cd /home/abdssamie/ChemforgeProjects/10xStudent/web
bun run dev          # Start dev server
npx tsc --noEmit     # Type check
```

## Notes

- Project uses `bun` not npm/yarn
- Web Worker runs in separate thread, no DOM access
- The `processTypstSvg()` function adds shadows and gaps between pages
- Typst uses points (pt), DOM uses pixels - conversion factor ~1.5
