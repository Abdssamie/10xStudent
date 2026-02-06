---
name: typst-wasm-codemirror
description: Use when implementing Typst document compilation in browser with WASM, integrating CodeMirror 6 editor, setting up Web Workers for compilation, configuring syntax highlighting, implementing PDF preview rendering, or building live document editors
---

# Typst WASM + CodeMirror 6 Integration

## Overview

Integrate Typst's WASM compiler with CodeMirror 6 to build browser-based document editors with live preview. Typst.ts provides three compilation strategies: server-side precompilation, client-side compilation with Web Workers, and all-in-one browser compilation.

**Core principle:** Decouple compilation from rendering using Typst's Vector Format for optimal performance and flexibility.

## When to Use

- Building live Typst document editors in the browser
- Implementing real-time preview with syntax highlighting
- Setting up incremental compilation with Web Workers
- Creating serverless document editing applications
- Integrating PDF/SVG export functionality
- Optimizing bundle size for production deployments

## Quick Start

### Basic Setup (All-in-One)

```html
<!DOCTYPE html>
<html>
  <head>
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js"
      id="typst"
    ></script>
  </head>
  <body>
    <div id="editor"></div>
    <div id="preview"></div>

    <script type="module">
      import { EditorView, basicSetup } from "codemirror";
      import { keymap } from "@codemirror/view";

      // Poll for $typst availability (module scripts don't fire load events reliably)
      async function waitForTypst(maxAttempts = 100, delayMs = 100) {
        for (let i = 0; i < maxAttempts; i++) {
          if (typeof window.$typst !== "undefined") {
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        throw new Error("Typst WASM module failed to load");
      }

      // Initialize Typst WASM modules
      await waitForTypst();

      $typst.setCompilerInitOptions({
        getModule: () =>
          "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
      });
      $typst.setRendererInitOptions({
        getModule: () =>
          "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm",
      });

      // Create CodeMirror editor
      const editor = new EditorView({
        doc: "= Hello, Typst!\n\nThis is a *live* preview.",
        extensions: [
          basicSetup,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              compileAndRender(update.state.doc.toString());
            }
          }),
        ],
        parent: document.getElementById("editor"),
      });

      // Compile and render function
      async function compileAndRender(content) {
        const svg = await $typst.svg({ mainContent: content });
        document.getElementById("preview").innerHTML = svg;
      }

      // Initial render
      compileAndRender(editor.state.doc.toString());
    </script>
  </body>
</html>
```

## Core Concepts

| Concept               | Description                                          | Use Case                                 |
| --------------------- | ---------------------------------------------------- | ---------------------------------------- |
| **Vector Format**     | Intermediate artifact format for decoupled rendering | Precompile on server, render in browser  |
| **All-in-One Bundle** | Complete bundle with fonts (~5MB)                    | Offline-capable editors                  |
| **Lite Bundle**       | Minimal bundle, loads resources from CDN             | Production apps with smaller bundle size |
| **TypstCompiler**     | Low-level compilation interface                      | Advanced control, custom workflows       |
| **TypstRenderer**     | Rendering engine (SVG/Canvas/PDF)                    | Multiple output formats                  |
| **$typst Snippet**    | High-level convenienck prototypes, simple use cases  |

## Common Patterns

### Pattern 1: Debounced Live Preview

```typescript
import { EditorView, basicSetup } from "codemirror";
import { debounce } from "lodash-es";

let editor: EditorView;
let compileTimeout: number;

// Debounced compilation (300ms delay)
const debouncedCompile = debounce(async (content: string) => {
  try {
    const svg = await $typst.svg({ mainContent: content });
    document.getElementById("preview")!.innerHTML = svg;
  } catch (error) {
    console.error("Compilation error:", error);
    showError(error);
  }
}, 300);

editor = new EditorView({
  doc: "= My Document\n\nContent here...",
  extensions: [
    basicSetup,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        debouncedCompile(update.state.doc.toString());
      }
    }),
  ],
  parent: document.getElementById("editor")!,
});
```

### Pattern 2: Web Worker Compilation

```typescript
// worker.ts - Compilation in Web Worker
import { createTypstCompiler } from '@myriaddreamin/typst-ts-web-compiler';

let compiler: any;

self.onmessage = async (e) => {
  const { type, content } = e.data;

  if (type === 'init') {ompiler = createTypstCompiler();
    await compiler.init({
      getModule: () => '/typst_ts_web_compiler_bg.wasm'
    });
    self.postMessage({ type: 'ready' });
  }

  if (type === 'compile') {
    try {
      const vectorData = await compiler.compile({
        mainContent: content
      });
      self.postMessage({
        type: 'result',
        data: vectorData
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
};

// main.ts - Main thread
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module'
});

worker.onmessageasync (e) => {
  if (e.data.type === 'result') {
    // Render in main thread
    const svg = await $typst.svg({
      vectorData: e.data.data
    });
    document.getElementById('preview')!.innerHTML = svg;
  }
};

// Send compilation request
worker.postMessage({
  type: 'compile',
  content: editorContent
});
```

### Pattern 3: Multi-Format Export

```typescript
async function exportDocument(
  content: string,
  format: "svg" | "pdf" | "vector",
) {
  switch (format) {
    case "svg":
      const svg = await $typst.svg({ mainContent: content });
      downloadFile(svg, "document.svg", "image/svg+xml");
      break;

    case "pdf":
      const pdfData = await $typst.pdf({ mainContent: content });
      const blob = new Blob([pdfData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      URL.revokeObjectURL(url);
      break;

    case "vector":
      // Compile once, cache for multiple renders
      const vectorData = await $typst.vector({ mainContent: content });
      // Can now render to SVG/Canvas without recompiling
      const cachedSvg = await $typst.svg({ vectorData });
      break;
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

## Quick Reference

### Installation

```bash
# All-in-one package
npm install @myriaddreamin/typst.ts

# Individual packages (tree-shakeable)
npm install @myriaddreamin/typst-ts-web-compiler
npm install @myriaddreamin/typst-ts-renderer

# CodeMirror 6
npm install codemirror @codemirror/view @codemirror/state
```

### Initialization Options

```typescript
// Compiler options
$typst.setCompilerInitOptions({
  getModule: () => "/path/to/typst_ts_web_compiler_bg.wasm",
  beforeBuild: (compiler) => {
    // Custom setup before compilation
  },
});

// Renderer options
$typst.setRendererInitOptions({
  getModule: () => "/path/to/typst_ts_renderer_bg.wasm",
  pixelPerPt: 2, // High DPI rendering
});
```

### Compilation API

```typescript
// Simple compilation
await $typst.svg({ mainContent: "Hello, Typst!" });
await $typst.pdf({ mainContent: "Hello, Typst!" });

// With additional files
await $typst.addSource("/template.typ", tContent);
await $typst.mapShadow("/assets/image.png", imageData);

// Compile to vector format (cache-friendly)
const vectorData = await $typst.vector({ mainContent: content });
await $typst.svg({ vectorData }); // Render without recompiling
```

### CodeMirror Integration

```typescript
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";

const editor = new EditorView({
  state: EditorState.create({
    doc: "= Document\n\nContent",
    extensions: [
      basicSetup,
      EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { overflow: "auto" },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          handleDocumentChange(update.state.doc.toString());
        }
      }),
    ],
  }),
  parent: document.getElementById("editor"),
});
```

## Performance Optimization

### Bundle Size Strategies

| Strategy     | Bundle Size | Load Time      | Use Case                |
| ------------ | ----------- | -------------- | ----------------------- |
| All-in-One   | ~5MB        | Slower initial | Offline apps            |
| Lite + CDN   | ~500KB      | Faster initial | Production web apps     |
| Lazy Loading | ~200KB      | Fastest        | Progressive enhancement |

### Lazy Loading Pattern

```typescript
let typstLoaded = false;

async function loadTypst() {
  if (typstLoaded) return;

  const script = document.createElement("script");
  script.type = "module";
  script.src =
    "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js";

  await new Promise((resolve) => {
    script.onload = resolve;
    document.head.appendChild(script);
  });

  typstLoaded = true;
}

// Load on user interaction
document
  .getElementById("editor")
  .addEventLtener("focus", loadTypst, { once: true });
```

## Error Handling

```typescript
async function safeCompile(content: string) {
  try {
    const svg = await $typst.svg({ mainContent: content });
    return { success: true, data: svg };
  } catch (error) {
    // Parse Typst compilation errors
    const errorMsg = error.message || "Unknown compilation error";

    // Extract line/column if available
    const match = errorMsg.match(/line (\d+), column (\d+)/);
    if (match) {
      const [, line, col] = match;
      highlightError(parseInt(line), parseInt(col));
    }

    return {
      success: false,
      error: errorMsg,
      line: match ? parseInt(match[1]) : null,
      column: match ? parseInt(match[2]) : null,
    };
  }
}
```

## Common Mistakes

| Mistake                           | Problem                                | Solution                                      |
| --------------------------------- | -------------------------------------- | --------------------------------------------- |
| Not debouncing compilation        | Excessive CPU usage on every keystroke | Use debounce (300ms) or Web Workers           |
| Loading full bundle in production | 5MB initial load                       | Use lite bundle + CDN resources               |
| Blocking main thread              | UI freezes during compilation          | Move compilation to Web Worker                |
| Noctor data                       | Recompiling for each format            | Compile once to vector, render multiple times |
| Missing WASM module paths         | Runtime errors in production           | Configure `getModule` paths correctly         |
| Synchronous compilation           | Blocking UI updates                    | Always use async/await                        |

## Troubleshooting

### Issue: WASM module not loading

**Symptom:** `RuntimeError: unreachable` or module fetch errors

**Solution:**

```typescript
// Ensure correct paths for production
$typst.setCompilerInitOptions({
  getModule: () =>
    new URL(
      "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
      import.meta.url,
    ).href,
});
```

### Issue: Fonts not rendering correctly

**Symptom:** Missing glyphs or fallback fonts

**Solution:**

```typescript
// Use all-in-one bundle with embedded fonts
// OR preload fonts
await $typst.use(
  TypstSnippet.preloadFonts([
    { family: "Linux Libertine", url: "/fonts/LinLibertine_R.ttf" },
  ]),
);
```

### Issue: Slow compilation on large documents

**Symptom:** UI freezes, poor responsiveness

**Solution:**

- Use Web Workers for compilation
- Implement incremental compilation
- Cache vector format artifacts
- Consider server-side precompilation

## Real-World Impact

- iew VSCode extension\*\*: Live preview with <100ms latency using incremental rendering
- **shiroa static site generator**: Precompiles documents to vector format, 10x smaller than PDF
- **Bundle size**: Lite bundle reduces initial load from 5MB to 500KB (90% reduction)
- **Compilation speed**: Web Worker pattern prevents UI blocking, maintains 60fps during typing

## References

- [Typst.ts Documentation](https://myriad-dreamin.github.io/typst.ts/)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Typst.ts GitHub](https://github.com/Myriad-Dreamin/typst.ts)
- [Vector Format Proposal](https://github.com/Myriad-Dreamin/typst.ts/blob/main/docs/proposals/8-vector-representation-for-rendering.typ)
