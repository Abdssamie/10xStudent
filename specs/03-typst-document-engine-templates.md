# Spec 3: Typst Document Engine & Templates

## 1. Context

### Goal

Integrate Typst CLI for server-side PDF compilation, implement 5 document templates, and provide CodeMirror 6 editor with syntax highlighting. Handle compilation errors with AI auto-fix capability.

### User Value

- Professional typesetting with Typst (LaTeX-quality output)
- Fast PDF preview (server-side compilation with 2s debounce, production-quality output)
- 5 ready-to-use templates for common document types
- Syntax highlighting for easier editing
- AI can auto-fix compilation errors
- Full Typst feature support (custom fonts, packages, imports)

### Dependencies

- Typst CLI v0.12.0+ (server-side Docker container)
- CodeMirror 6 (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-*`)
- Spec 2 (TanStack AI) - AI auto-fix for errors
- Spec 1 (Database) - Template storage
- Docker (for Typst CLI container)

---

## 2. User Stories (Prioritized)

### P1: Template Selection

- **US-01**: As a user, I want to select a template when creating a document, so that I start with proper structure.
- **US-02**: As a user, I want templates for common document types (research paper, report, essay, article, notes), so that I don't have to write boilerplate.
- **US-03**: As a user, I want the template to pre-fill the editor with Typst code, so that I can see and modify the structure.

### P1: Typst Editing

- **US-04**: As a user, I want syntax highlighting in the editor, so that Typst code is easier to read.
- **US-05**: As a user, I want to edit Typst source directly, so that I can make quick fixes without waiting for AI.
- **US-06**: As a user, I want the editor to enforce a 1000-line limit, so that I don't create documents that are too large.

### P1: PDF Preview

- **US-07**: As a user, I want to see a live PDF preview, so that I can verify my document looks correct.
- **US-08**: As a user, I want the preview to update automatically (2s debounce), so that I see changes without excessive server requests.
- **US-09**: As a user, I want the preview to compile on the server, so that I get production-quality output with full Typst features.

### P1: Error Handling

- **US-10**: As a user, I want to see compilation errors in a bottom panel, so that I know what's wrong.
- **US-11**: As a user, I want the error panel to open automatically when errors occur, so that I don't miss them.
- **US-12**: As a user, I want the AI to auto-fix compilation errors (with my approval), so that I don't have to debug Typst syntax.

---

## 3. Functional Requirements (Testable)

### Typst CLI Integration

- **FR-01**: System MUST use Typst CLI v0.12.0+ running in Docker container for server-side compilation.
- **FR-02**: System MUST NOT use Web Workers (compilation happens on server).
- **FR-03**: System MUST compile Typst to PDF format and return as binary blob.
- **FR-04**: System MUST handle compilation errors gracefully and return error responses with 500 status.
- **FR-05**: System MUST compile documents up to 1000 lines within 3 seconds (including network latency).
- **FR-60**: System MUST provide `/api/compile` endpoint that accepts Typst source code.
- **FR-61**: System MUST run Typst CLI in Docker container with pre-installed fonts.
- **FR-62**: System MUST support custom fonts (mounted in Docker container at `/usr/share/fonts/custom`).
- **FR-63**: System MUST support Typst packages (via `typst compile --root` flag).
- **FR-64**: System MUST return compiled PDF as binary blob with `Content-Type: application/pdf`.
- **FR-65**: System MUST cache compiled PDFs (keyed by content hash) for 5 minutes to reduce server load.
- **FR-66**: System MUST rate-limit compilation requests (max 10 per minute per user).
- **FR-67**: System MUST log compilation errors with full Typst error output for debugging.
- **FR-68**: System MUST handle compilation timeouts (max 10 seconds per document).

### Template System

- **FR-06**: System MUST provide 5 templates:
  1. **Research Paper**: Abstract, Introduction, Methodology, Results, Conclusion, References
  2. **Report**: Executive Summary, Background, Findings, Recommendations, Appendix
  3. **Essay**: Introduction, Body Paragraphs, Conclusion
  4. **Article**: Headline, Byline, Lead, Body, Conclusion
  5. **Notes**: Simple structure with headings and bullet points
- **FR-07**: System MUST store templates in `packages/templates/src/typst/`.
- **FR-08**: System MUST include sample content (lorem ipsum) in templates.
- **FR-09**: System MUST pre-fill editor with template content when user selects template.
- **FR-10**: System MUST allow users to edit template structure immediately.

### CodeMirror 6 Editor

- **FR-11**: System MUST use CodeMirror 6 for Typst editing.
- **FR-12**: System MUST provide Typst syntax highlighting (custom language mode).
- **FR-13**: System MUST enforce 1000-line limit using CodeMirror transaction filter to actually block input (not just warn).
- **FR-14**: System MUST provide undo/redo functionality.
- **FR-15**: System MUST support CodeMirror transactions for AI edits (from Spec 2).
- **FR-16**: System MUST provide line numbers.
- **FR-17**: System MUST provide basic editor features:
  - Tab indentation
  - Auto-closing brackets
  - Line wrapping
  - Search/replace

### PDF Preview

- **FR-18**: System MUST display PDF preview in browser (using `<embed>` or `<iframe>`).
- **FR-19**: System MUST update preview on content change (2000ms debounce, then server compilation).
- **FR-20**: System MUST show loading indicator during compilation.
- **FR-21**: System MUST display compilation time in status bar (from response header).
- **FR-22**: System MUST handle large documents (up to 1000 lines) without blocking user input (server-side compilation).

### Error Handling

- **FR-23**: System MUST display compilation errors in bottom panel.
- **FR-24**: System MUST auto-open error panel when compilation fails.
- **FR-25**: System MUST show error message from Typst CLI stderr (full error output for debugging).
- **FR-26**: System MUST provide "Ask AI to Fix" button in error panel.
- **FR-27**: System MUST require user approval before applying AI fixes.
- **FR-28**: System MUST show diff of AI-proposed changes before applying.

### Line Limit Enforcement

- **FR-29**: System MUST count lines in real-time.
- **FR-30**: System MUST block input when 1000-line limit reached using transaction filter (prevents the change from being applied).
- **FR-31**: System MUST validate line count on save (server-side, from Spec 1).
- **FR-32**: System MUST show warning at 900 lines (soft limit).

---

## 4. Technical Architecture

### Server-Side Compilation Architecture

**Key Decision**: Typst CLI runs in Docker container on server (not WASM in browser)

**Benefits**:

- ✅ Full Typst feature support (packages, imports, custom fonts)
- ✅ Consistent output (matches local Typst CLI exactly)
- ✅ Server-side observability (logging, error tracking)
- ✅ PDF caching for performance

**Tradeoff**: Preview depends on network requests (~2-3s total including debounce)

#### Docker Container Setup

```dockerfile
# apps/api/Dockerfile.typst
FROM ghcr.io/typst/typst:v0.12.0

# Install custom fonts
RUN mkdir -p /usr/share/fonts/custom
COPY fonts/ /usr/share/fonts/custom/
RUN fc-cache -fv

# Install Typst packages (if needed)
RUN mkdir -p /root/.local/share/typst/packages

WORKDIR /app
CMD ["sh"]
```

#### Compilation API Endpoint

See `SPEC_3_ARCHITECTURE_UPDATE.md` for complete implementation details.

**Endpoint**: `POST /api/compile`

**Request**:

```json
{
  "typstContent": "string (max 100000 chars)",
  "documentId": "uuid (optional)"
}
```

**Response (Success)**:

```
Content-Type: application/pdf
X-Compilation-Time: <milliseconds>
X-Cache-Hit: true|false
<binary PDF data>
```

**Response (Error)**:

```json
{
  "error": "Compilation failed",
  "message": "<Typst error output>",
  "duration": <milliseconds>
}
```

**Features**:

- Content-based caching (5-minute TTL)
- Automatic cache cleanup
- Timeout handling (10 seconds max)
- Full error logging

### Template Structure

```typescript
// packages/templates/src/typst/index.ts
export interface TypstTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
}

export const TYPST_TEMPLATES: TypstTemplate[] = [
  {
    id: "research-paper",
    name: "Research Paper",
    description:
      "Academic research paper with abstract, sections, and bibliography",
    category: "academic",
    content: `#set document(title: "Research Paper", author: "Your Name")
#set page(numbering: "1", number-align: center)
#set text(font: "Linux Libertine", size: 11pt)
#set par(justify: true)

#align(center)[
  #text(17pt, weight: "bold")[Your Research Title]
  
  #v(1em)
  
  Your Name
  
  Your Institution
  
  #v(1em)
  
  #datetime.today().display()
]

#v(2em)

= Abstract

#lorem(100)

#v(1em)

*Keywords:* keyword1, keyword2, keyword3

#pagebreak()

= Introduction

#lorem(150)

== Background

#lorem(100)

== Research Question

#lorem(50)

= Methodology

#lorem(150)

== Data Collection

#lorem(100)

== Analysis

#lorem(100)

= Results

#lorem(200)

== Findings

#lorem(150)

= Discussion

#lorem(150)

= Conclusion

#lorem(100)

= References

// Citations will be inserted here by AI
`,
  },
  {
    id: "report",
    name: "Report",
    description: "Business or technical report with executive summary",
    category: "business",
    content: `#set document(title: "Report", author: "Your Name")
#set page(numbering: "1", number-align: center)
#set text(font: "Linux Libertine", size: 11pt)

#align(center)[
  #text(17pt, weight: "bold")[Report Title]
  
  #v(1em)
  
  Prepared by: Your Name
  
  Date: #datetime.today().display()
]

#v(2em)

= Executive Summary

#lorem(100)

#pagebreak()

= Background

#lorem(150)

== Context

#lorem(100)

== Objectives

#lorem(50)

= Findings

#lorem(200)

== Key Insights

#lorem(150)

= Recommendations

#lorem(150)

== Short-term Actions

#lorem(100)

== Long-term Strategy

#lorem(100)

= Conclusion

#lorem(100)

= Appendix

// Additional materials
`,
  },
  {
    id: "essay",
    name: "Essay",
    description: "Academic essay with introduction, body, and conclusion",
    category: "academic",
    content: `#set document(title: "Essay", author: "Your Name")
#set page(numbering: "1", number-align: center)
#set text(font: "Linux Libertine", size: 12pt)
#set par(justify: true, leading: 0.65em)

#align(center)[
  #text(14pt, weight: "bold")[Essay Title]
  
  #v(1em)
  
  Your Name
  
  Course Name
  
  #datetime.today().display()
]

#v(2em)

= Introduction

#lorem(100)

= Body

== First Point

#lorem(150)

== Second Point

#lorem(150)

== Third Point

#lorem(150)

= Conclusion

#lorem(100)

= Works Cited

// Citations will be inserted here
`,
  },
  {
    id: "article",
    name: "Article",
    description: "Magazine or blog article with headline and byline",
    category: "writing",
    content: `#set document(title: "Article", author: "Your Name")
#set page(numbering: "1", number-align: center)
#set text(font: "Linux Libertine", size: 11pt)
#set par(justify: true)

#align(center)[
  #text(20pt, weight: "bold")[Compelling Headline]
  
  #v(0.5em)
  
  #text(12pt, style: "italic")[Engaging Subheadline]
  
  #v(1em)
  
  By Your Name | #datetime.today().display()
]

#v(2em)

#text(weight: "bold")[Lead paragraph:] #lorem(50)

#v(1em)

#lorem(150)

== Section Heading

#lorem(150)

== Another Section

#lorem(150)

== Final Section

#lorem(100)

#v(1em)

#align(center)[
  #text(10pt, style: "italic")[---]
]
`,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Simple note-taking template with headings and lists",
    category: "general",
    content: `#set document(title: "Notes", author: "Your Name")
#set page(numbering: "1", number-align: center)
#set text(font: "Linux Libertine", size: 11pt)

#align(center)[
  #text(17pt, weight: "bold")[Notes Title]
  
  #v(0.5em)
  
  #datetime.today().display()
]

#v(1em)

= Topic 1

- Key point 1
- Key point 2
- Key point 3

== Subtopic

#lorem(50)

= Topic 2

- Important note
- Another note
- Follow-up item

= Topic 3

#lorem(100)

= Action Items

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`,
  },
];
```

### Typst WASM Integration (Web Worker)

**Why Web Worker?** Typst compilation can take 1-3 seconds for large documents. Running in a Web Worker prevents UI freezing and maintains responsiveness.

```typescript
// apps/web/lib/typst-worker.ts
import { createTypstCompiler } from "@myriaddreamin/typst.ts";

let compiler: any = null;

self.onmessage = async (e) => {
  const { type, content, id } = e.data;

  if (type === "init") {
    try {
      compiler = await createTypstCompiler();
      await compiler.init();
      self.postMessage({ type: "init-complete", id });
    } catch (error) {
      self.postMessage({
        type: "init-error",
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return;
  }

  if (type === "compile") {
    const start = Date.now();
    try {
      const result = await compiler.compile({ mainContent: content });
      if (result.result === "ok") {
        self.postMessage({
          type: "compile-success",
          id,
          pdf: result.pdf,
          duration: Date.now() - start,
        });
      } else {
        self.postMessage({
          type: "compile-error",
          id,
          error: result.message || "Compilation failed",
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      self.postMessage({
        type: "compile-error",
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - start,
      });
    }
  }
};
```

```typescript
// apps/web/lib/typst-compiler.ts
let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, (result: any) => void>();

export async function initTypstCompiler() {
  if (worker) return;

  worker = new Worker(new URL("./typst-worker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (e) => {
    const { type, id, pdf, error, duration } = e.data;
    const resolve = pendingRequests.get(id);
    if (resolve) {
      if (type === "init-complete") {
        resolve({ success: true });
      } else if (type === "init-error") {
        resolve({ success: false, error });
      } else if (type === "compile-success") {
        resolve({ success: true, pdf, duration });
      } else if (type === "compile-error") {
        resolve({ success: false, error, duration });
      }
      pendingRequests.delete(id);
    }
  };

  // Wait for init
  return new Promise((resolve) => {
    const id = requestId++;
    pendingRequests.set(id, resolve);
    worker!.postMessage({ type: "init", id });
  });
}

export async function compileTypst(content: string): Promise<{
  success: boolean;
  pdf?: Uint8Array;
  error?: string;
  duration: number;
}> {
  if (!worker) await initTypstCompiler();

  return new Promise((resolve) => {
    const id = requestId++;
    pendingRequests.set(id, resolve);
    worker!.postMessage({ type: "compile", content, id });
  });
}

// Cleanup function for component unmount
export function terminateTypstCompiler() {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingRequests.clear();
  }
}
```

### CodeMirror Setup

```typescript
// apps/web/components/editor/TypstEditor.tsx
import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Transaction } from '@codemirror/state'
import { typstLanguage } from './typst-language'

interface TypstEditorProps {
  initialContent: string
  onChange: (content: string) => void
  onLineCountChange: (count: number) => void
}

export function TypstEditor({ initialContent, onChange, onLineCountChange }: TypstEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [lineCount, setLineCount] = useState(0)

  useEffect(() => {
    if (!editorRef.current) return

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        basicSetup,
        typstLanguage,
        // Transaction filter to actually block input at 1000 lines
        EditorState.transactionFilter.of((tr: Transaction) => {
          if (tr.docChanged) {
            const newLineCount = tr.newDoc.lines
            if (newLineCount > 1000) {
              // Block the transaction - this actually prevents the change
              return []
            }
          }
          return tr
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString()
            const lines = update.state.doc.lines

            setLineCount(lines)
            onLineCountChange(lines)
            onChange(content)
          }
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  return (
    <div className="relative h-full">
      <div ref={editorRef} className="h-full overflow-auto" />
      {lineCount > 900 && (
        <div className="absolute bottom-0 left-0 right-0 bg-yellow-100 border-t border-yellow-300 px-4 py-2 text-sm">
          {lineCount >= 1000 ? (
            <span className="text-red-600 font-semibold">
              Line limit reached ({lineCount}/1000). Cannot add more lines.
            </span>
          ) : (
            <span className="text-yellow-800">
              Warning: Approaching line limit ({lineCount}/1000)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// apps/web/components/editor/typst-language.ts
import { LanguageSupport, StreamLanguage } from '@codemirror/language'

// Simple Typst syntax highlighting
const typstSyntax = {
  token(stream: any, state: any) {
    // Headings
    if (stream.match(/^=+\s/)) {
      return 'heading'
    }

    // Comments
    if (stream.match(/^\/\/.*/)) {
      return 'comment'
    }

    // Functions
    if (stream.match(/^#[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return 'keyword'
    }

    // Strings
    if (stream.match(/^"([^"\\]|\\.)*"/)) {
      return 'string'
    }

    // Numbers
    if (stream.match(/^[0-9]+(\.[0-9]+)?/)) {
      return 'number'
    }

    stream.next()
    return null
  },
}

export const typstLanguage = new LanguageSupport(
  StreamLanguage.define(typstSyntax)
)
```

### PDF Preview Component

```typescript
// apps/web/components/preview/PDFPreview.tsx
import { useEffect, useState, useCallback } from 'react'
import { compileTypst } from '@/lib/typst-compiler'
import { useDebounce } from '@/hooks/useDebounce'

interface PDFPreviewProps {
  content: string
  onError: (error: string) => void
  onCompilationTime: (duration: number) => void
}

export function PDFPreview({ content, onError, onCompilationTime }: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)

  const debouncedContent = useDebounce(content, 500)

  const compile = useCallback(async () => {
    setIsCompiling(true)

    const result = await compileTypst(debouncedContent)

    onCompilationTime(result.duration)

    if (result.success && result.pdf) {
      // Create blob URL for PDF
      const blob = new Blob([result.pdf], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // Revoke old URL to prevent memory leak
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }

      setPdfUrl(url)
      onError('') // Clear errors
    } else {
      onError(result.error || 'Compilation failed')
    }

    setIsCompiling(false)
  }, [debouncedContent, pdfUrl, onError, onCompilationTime])

  useEffect(() => {
    compile()
  }, [compile])

  // Cleanup: Revoke blob URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  return (
    <div className="relative h-full">
      {isCompiling && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="text-sm text-gray-600">Compiling...</div>
        </div>
      )}

      {pdfUrl ? (
        <embed
          src={pdfUrl}
          type="application/pdf"
          className="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          No preview available
        </div>
      )}
    </div>
  )
}
```

### Error Panel Component

```typescript
// apps/web/components/editor/ErrorPanel.tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorPanelProps {
  error: string | null
  onAskAIToFix: () => void
}

export function ErrorPanel({ error, onAskAIToFix }: ErrorPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (error) {
      setIsOpen(true)
    }
  }, [error])

  if (!error) return null

  return (
    <div className={`border-t border-red-300 bg-red-50 transition-all ${isOpen ? 'h-32' : 'h-0 overflow-hidden'}`}>
      <div className="flex items-start justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-semibold">Compilation Error</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </div>
          <div className="text-sm text-red-800 font-mono">
            {error}
          </div>
        </div>
        <Button
          size="sm"
          onClick={onAskAIToFix}
          className="ml-4"
        >
          Ask AI to Fix
        </Button>
      </div>
    </div>
  )
}
```

### AI Auto-Fix Flow

**Complete Flow with User Approval:**

1. User clicks "Ask AI to Fix" in ErrorPanel
2. AI analyzes error and proposes fix using `replaceContent` tool
3. System shows diff preview in modal (before applying)
4. User approves or rejects
5. If approved, apply changes via EditorContext

```typescript
// apps/web/hooks/useAIAutoFix.ts
import { useState } from "react";
import { useTypstChat } from "./useTypstChat";
import { useEditorContext } from "@/contexts/EditorContext";

interface ProposedFix {
  newContent: string;
  explanation: string;
  diff: string;
}

export function useAIAutoFix(documentId: string) {
  const [isFixing, setIsFixing] = useState(false);
  const [proposedFix, setProposedFix] = useState<ProposedFix | null>(null);
  const chat = useTypstChat(documentId, "quick");
  const { currentContent, applyEdit } = useEditorContext();

  const requestFix = async (error: string) => {
    setIsFixing(true);

    try {
      // Send error to AI with current content
      await chat.append({
        role: "user",
        content: `The Typst document has a compilation error: "${error}". Please analyze and fix it.

Current content:
\`\`\`typst
${currentContent}
\`\`\`

Use the replaceContent tool to propose a fix.`,
      });

      // AI will call replaceContent tool, which triggers EditorContext.onToolCall
      // The tool call is intercepted and stored as proposedFix (not auto-applied)
    } catch (error) {
      console.error("AI fix request failed:", error);
    } finally {
      setIsFixing(false);
    }
  };

  const applyFix = () => {
    if (!proposedFix) return;

    // Apply the fix via EditorContext
    applyEdit({
      type: "replace",
      content: proposedFix.newContent,
    });

    setProposedFix(null);
  };

  const rejectFix = () => {
    setProposedFix(null);
  };

  return {
    isFixing,
    proposedFix,
    requestFix,
    applyFix,
    rejectFix,
  };
}
```

```typescript
// apps/web/components/editor/FixApprovalModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { diffLines } from 'diff'

interface FixApprovalModalProps {
  isOpen: boolean
  currentContent: string
  proposedContent: string
  explanation: string
  onApprove: () => void
  onReject: () => void
}

export function FixApprovalModal({
  isOpen,
  currentContent,
  proposedContent,
  explanation,
  onApprove,
  onReject,
}: FixApprovalModalProps) {
  const diff = diffLines(currentContent, proposedContent)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>AI Proposed Fix</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Explanation:</h3>
            <p className="text-sm text-gray-700">{explanation}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Changes:</h3>
            <div className="bg-gray-50 p-4 rounded font-mono text-xs overflow-auto max-h-96">
              {diff.map((part, index) => (
                <div
                  key={index}
                  className={
                    part.added
                      ? 'bg-green-100 text-green-800'
                      : part.removed
                      ? 'bg-red-100 text-red-800 line-through'
                      : ''
                  }
                >
                  {part.value}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button onClick={onApprove}>
            Apply Fix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Integration with EditorContext (from Spec 2):**

```typescript
// In EditorContext, intercept replaceContent tool calls during auto-fix
const handleToolCall = (toolCall: ToolCall) => {
  if (toolCall.name === "replaceContent" && isAutoFixMode) {
    // Don't apply immediately - store as proposed fix
    setProposedFix({
      newContent: toolCall.args.content,
      explanation: toolCall.args.explanation || "AI proposed fix",
      diff: generateDiff(currentContent, toolCall.args.content),
    });
    return; // Don't execute tool
  }

  // Normal tool execution for non-auto-fix scenarios
  executeToolCall(toolCall);
};
```

---

## 5. Success Criteria (Measurable)

- **SC-01**: Typst compilation completes within 3 seconds total (including network latency) for documents up to 1000 lines.
- **SC-02**: PDF preview updates within 3 seconds of content change (2s debounce + 1s compilation + network).
- **SC-03**: Syntax highlighting renders correctly for all Typst syntax elements.
- **SC-04**: Line limit enforcement actually blocks transactions at 1000 lines (verified by attempting to type/paste beyond limit).
- **SC-05**: Error panel opens automatically within 100ms of compilation error.
- **SC-06**: AI auto-fix success rate >80% for common Typst syntax errors.
- **SC-07**: PDF caching reduces compilation time to <100ms for repeated content (cache hit).
- **SC-08**: Compilation timeout triggers after 10 seconds with appropriate error message.
- **SC-09**: Rate limiting prevents more than 10 compilations per minute per user.

---

## 6. Edge Cases & Error Handling

### Compilation Errors

- **EC-01**: If Typst CLI fails to compile, return error with full Typst error message in response body.
- **EC-02**: If compilation takes >10 seconds, terminate process and return timeout error.
- **EC-03**: If PDF is too large (>10MB), return warning but allow download.
- **EC-04**: If Docker container is unavailable, return 503 Service Unavailable.
- **EC-05**: If temporary file creation fails, return 500 with descriptive error.
- **EC-06**: If cache cleanup fails, log error but continue operation.

### Editor Errors

- **EC-07**: If line count exceeds 1000, block input and show error.
- **EC-08**: If CodeMirror fails to initialize, fallback to textarea.

### Template Errors

- **EC-09**: If template content is invalid, use empty document.

---

## 7. Implementation Checklist

### Setup

- [ ] Install Docker and Docker Compose
- [ ] Pull Typst CLI Docker image: `ghcr.io/typst/typst:v0.12.0`
- [ ] Create `apps/api/Dockerfile.typst` for custom font support
- [ ] Mount custom fonts directory in Docker container
- [ ] Configure Typst package directory
- [ ] Remove WASM dependencies: `@myriaddreamin/typst.ts`
- [ ] Add server dependencies: `child_process`, `fs/promises`, `crypto`

### Server Integration

- [ ] Create `/api/compile` endpoint in Hono API
- [ ] Implement Typst CLI execution with `child_process.exec`
- [ ] Implement temporary file management (write input, read output, cleanup)
- [ ] Implement PDF caching with content hash
- [ ] Implement cache cleanup job (every 10 minutes)
- [ ] Implement error parsing from Typst CLI stderr
- [ ] Add compilation timeout (10 seconds)
- [ ] Add rate limiting (10 requests/minute per user)
- [ ] Add logging for all compilation operations

### Frontend Updates

- [ ] Update PDFPreview component to use `/api/compile` endpoint
- [ ] Change debounce from 500ms to 2000ms
- [ ] Update loading indicator text to "Compiling on server..."
- [ ] Add compilation time display from response header
- [ ] Update error handling to show full Typst error messages
- [ ] Remove all WASM-related code

### Editor

- [ ] Implement CodeMirror 6 setup
- [ ] Implement Typst syntax highlighting
- [ ] Implement line count tracking
- [ ] Implement 1000-line limit enforcement using transaction filter

### Error Handling

- [ ] Implement error panel component
- [ ] Implement AI auto-fix flow with EditorContext integration
- [ ] Implement fix approval modal with diff preview
- [ ] Implement tool call interception for auto-fix mode

### Testing

- [ ] Unit tests for compilation endpoint
- [ ] E2E tests for PDF preview with server compilation
- [ ] E2E tests for error handling
- [ ] Performance tests for compilation time
- [ ] Cache hit/miss tests
- [ ] Timeout handling tests

---

## 8. Out of Scope

- Advanced Typst features (custom packages, complex layouts)
- PDF export/download (handled in Spec 5)
- Source citation formatting (handled in Spec 4)
- AI chat interface (handled in Spec 2)

---

## 9. Next Steps

After completing this spec:

1. Proceed to **Spec 4: Source Management & RAG**
2. Templates will be used for document creation
3. Editor will be used by AI to insert content
