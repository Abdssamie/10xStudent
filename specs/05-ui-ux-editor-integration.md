# Spec 5: UI/UX & Editor Integration

## 1. Context

### Goal

Build the complete user interface that integrates all components: authentication, document list, editor layout, AI chat, PDF preview, source sidebar, and status indicators. This spec ties together all previous specs into a cohesive user experience.

### User Value

- Intuitive layout optimized for document creation
- Seamless switching between AI chat and editor
- Real-time feedback on compilation, credits, and AI operations
- Responsive design for desktop (mobile out of scope for MVP)
- Clean, modern UI using shadcn/ui components

### Dependencies

- Spec 1 (Database & API) - Document CRUD, credits
- Spec 2 (TanStack AI) - AI chat integration
- Spec 3 (Typst) - Editor and preview components
- Spec 4 (Sources) - Source sidebar
- Clerk authentication
- shadcn/ui components
- Zustand state management
- TanStack Query

---

## 2. User Stories (Prioritized)

### P1: Authentication

- **US-01**: As a user, I want to sign in with Clerk immediately on app load, so that my documents are secure.
- **US-02**: As a user, I want to see my profile in the UI, so that I know I'm signed in.

### P1: Document List

- **US-03**: As a user, I want to see a list of my documents, so that I can access previous work.
- **US-04**: As a user, I want to create a new document from the list, so that I can start working.
- **US-05**: As a user, I want to delete documents from the list, so that I can remove unwanted content.

### P1: Template Selection

- **US-06**: As a user, I want to select a template when creating a document, so that I start with proper structure.
- **US-07**: As a user, I want to see template previews, so that I can choose the right one.

### P1: Editor Layout

- **US-08**: As a user, I want a collapsible left sidebar for documents/sources/settings, so that I can maximize editor space.
- **US-09**: As a user, I want to toggle between AI chat and editor in the center pane, so that I can switch contexts easily.
- **US-10**: As a user, I want a fixed right pane for PDF preview, so that I always see my output.
- **US-11**: As a user, I want a bottom error panel that auto-opens on errors, so that I'm alerted to problems.

### P1: AI Chat Interface

- **US-12**: As a user, I want to chat with AI to refine my document, so that the AI understands my needs.
- **US-13**: As a user, I want to see streaming progress, so that I know the AI is working.
- **US-14**: As a user, I want to configure research depth, so that I can balance speed and thoroughness.

### P1: Status Bar

- **US-15**: As a user, I want to see my credit balance in the status bar, so that I know how much AI usage I have left.
- **US-16**: As a user, I want to see compilation status, so that I know if my document is valid.
- **US-17**: As a user, I want to see auto-save status, so that I know my work is saved.

### P1: Auto-Save

- **US-18**: As a user, I want my document to auto-save every 5 seconds, so that I don't lose work.
- **US-19**: As a user, I want a manual save button, so that I can force a save.

### P2: Settings

- **US-20**: As a user, I want to configure default citation format, so that new documents use my preference.
- **US-21**: As a user, I want to configure default research depth, so that AI uses my preference.

---

## 3. Functional Requirements (Testable)

### Authentication (Clerk)

- **FR-01**: System MUST use Clerk for authentication.
- **FR-02**: System MUST require sign-in immediately on app load.
- **FR-03**: System MUST redirect unauthenticated users to sign-in page.
- **FR-04**: System MUST display user profile (avatar, name) in UI.
- **FR-05**: System MUST provide sign-out button.

### Document List

- **FR-06**: System MUST display list of user's documents (from Spec 1 API).
- **FR-07**: System MUST show document metadata (title, updatedAt).
- **FR-08**: System MUST sort documents by most recently updated.
- **FR-09**: System MUST provide "New Document" button.
- **FR-10**: System MUST provide delete button per document.
- **FR-11**: System MUST confirm before deleting documents.

### Template Selection

- **FR-12**: System MUST show template selector modal on "New Document".
- **FR-13**: System MUST display 5 templates (from Spec 3).
- **FR-14**: System MUST show template preview images.
- **FR-15**: System MUST create document with selected template content.

### Layout

- **FR-16**: System MUST provide 3-pane layout:
  - **Left Sidebar** (collapsible, 300px): Document list, Source library, Settings, Credits
  - **Center Pane** (flexible): AI Chat ↔ Editor (toggle)
  - **Right Pane** (50%): PDF Preview
- **FR-17**: System MUST provide toggle button to switch between AI Chat and Editor.
- **FR-18**: System MUST persist sidebar collapsed state in localStorage.
- **FR-19**: System MUST provide bottom error panel (auto-opens on errors).

### AI Chat Interface

- **FR-20**: System MUST integrate `useTypstChat` hook (from Spec 2).
- **FR-21**: System MUST display chat messages (user and AI).
- **FR-22**: System MUST show streaming progress in real-time.
- **FR-23**: System MUST provide input field for user messages.
- **FR-24**: System MUST provide research depth selector (quick/deep).
- **FR-25**: System MUST disable input when out of credits.

### Editor Integration

- **FR-26**: System MUST integrate `TypstEditor` component (from Spec 3).
- **FR-27**: System MUST provide CodeMirror instance to AI tools (from Spec 2).
- **FR-28**: System MUST show line count in status bar.
- **FR-29**: System MUST show warning at 900 lines, error at 1000 lines.

### PDF Preview

- **FR-30**: System MUST integrate `PDFPreview` component (from Spec 3).
- **FR-31**: System MUST update preview on content change (500ms debounce).
- **FR-32**: System MUST show compilation time in status bar.

### Source Sidebar

- **FR-33**: System MUST integrate `SourceSidebar` component (from Spec 4).
- **FR-34**: System MUST display sources in left sidebar.
- **FR-35**: System MUST update sources when AI adds them.

### Status Bar

- **FR-36**: System MUST display status bar at bottom of screen.
- **FR-37**: System MUST show:
  - Credit balance (e.g., "Credits: 9,850")
  - Compilation status (e.g., "Compiled in 1.2s" or "Compilation failed")
  - Auto-save status (e.g., "Saved" or "Saving...")
  - Line count (e.g., "Lines: 245/1000")
- **FR-38**: System MUST update status bar in real-time.

### Auto-Save

- **FR-39**: System MUST auto-save document every 5 seconds (debounced).
- **FR-40**: System MUST trigger save on AI regeneration.
- **FR-41**: System MUST provide manual save button (Ctrl+S or button).
- **FR-42**: System MUST show "Saving..." indicator during save.
- **FR-43**: System MUST show "Saved" indicator after successful save.
- **FR-44**: System MUST retry failed saves with exponential backoff.

### Settings

- **FR-45**: System MUST provide settings panel in left sidebar.
- **FR-46**: System MUST allow configuration:
  - Default citation format (APA/MLA/Chicago)
  - Default research depth (quick/deep)
  - LLM provider (Gemini/OpenAI/Anthropic/Ollama) - display only, not editable in MVP
- **FR-47**: System MUST persist settings in database (user preferences from Spec 1).

### State Management (Zustand)

- **FR-48**: System MUST use Zustand for UI state only:
  - Current document ID
  - Sidebar collapsed state
  - Current view (chat/editor)
- **FR-49**: System MUST NOT store document content in Zustand (CodeMirror owns content).
- **FR-50**: System MUST NOT store EditorView in Zustand (use EditorContext instead).
- **FR-51**: System MUST use TanStack Query for server state (documents, sources, credits).
- **FR-52**: System MUST use React Context (EditorContext) for EditorView reference.

---

## 4. Technical Architecture

### App Structure

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   └── sign-up/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Main layout with sidebar
│   │   ├── page.tsx            # Document list
│   │   └── documents/
│   │       └── [id]/
│   │           ├── layout.tsx  # EditorProvider wrapper
│   │           └── page.tsx    # Document editor
│   └── layout.tsx              # Root layout with Clerk
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── StatusBar.tsx
│   │   └── ErrorPanel.tsx
│   ├── documents/
│   │   ├── DocumentList.tsx
│   │   ├── TemplateSelector.tsx
│   │   └── DocumentCard.tsx
│   ├── editor/
│   │   ├── TypstEditor.tsx     # From Spec 3
│   │   ├── EditorToolbar.tsx
│   │   └── typst-language.ts
│   ├── chat/
│   │   ├── AIChat.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ResearchDepthSelector.tsx
│   ├── preview/
│   │   └── PDFPreview.tsx      # From Spec 3
│   ├── sources/
│   │   └── SourceSidebar.tsx   # From Spec 4
│   ├── settings/
│   │   └── SettingsPanel.tsx
│   └── ui/                     # shadcn/ui components
├── contexts/
│   └── EditorContext.tsx       # EditorView context (NOT Zustand)
├── hooks/
│   ├── useTypstChat.ts         # From Spec 2
│   ├── useDocument.ts
│   ├── useAutoSave.ts
│   └── useDebounce.ts
├── lib/
│   ├── typst-compiler.ts       # From Spec 3
│   ├── templates.ts            # Template definitions
│   └── utils.ts
└── store/
    └── document-store.ts       # Zustand store (UI state only)
```

### Zustand Store

**IMPORTANT**: Zustand should only store UI state. EditorView is mutable and violates Zustand principles. Use EditorContext instead (see below).

```typescript
// apps/web/store/document-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DocumentStore {
  // Current state (UI only)
  currentDocumentId: string | null;
  currentView: "chat" | "editor";
  sidebarCollapsed: boolean;

  // Actions
  setCurrentDocument: (id: string | null) => void;
  setCurrentView: (view: "chat" | "editor") => void;
  toggleSidebar: () => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set) => ({
      currentDocumentId: null,
      currentView: "chat",
      sidebarCollapsed: false,

      setCurrentDocument: (id) => set({ currentDocumentId: id }),
      setCurrentView: (view) => set({ currentView: view }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: "document-store",
    },
  ),
);
```

### EditorContext (for EditorView Reference)

**IMPORTANT**: EditorView is a mutable CodeMirror object that should NOT be stored in Zustand. Use React Context instead.

```typescript
// apps/web/contexts/EditorContext.tsx
import { createContext, useContext, useRef, ReactNode } from 'react';
import { EditorView } from '@codemirror/view';

interface EditorContextType {
  editorView: EditorView | null;
  setEditorView: (view: EditorView) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const editorViewRef = useRef<EditorView | null>(null);

  const setEditorView = (view: EditorView) => {
    editorViewRef.current = view;
  };

  return (
    <EditorContext.Provider value={{
      editorView: editorViewRef.current,
      setEditorView
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
}
```

### Main Layout

**IMPORTANT**: This component must be wrapped with EditorProvider in the layout file.

```typescript
// apps/web/app/(dashboard)/documents/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDocumentStore } from '@/store/document-store'
import { useAutoSave } from '@/hooks/useAutoSave'
import { Sidebar } from '@/components/layout/Sidebar'
import { StatusBar } from '@/components/layout/StatusBar'
import { ErrorPanel } from '@/components/layout/ErrorPanel'
import { AIChat } from '@/components/chat/AIChat'
import { TypstEditor } from '@/components/editor/TypstEditor'
import { PDFPreview } from '@/components/preview/PDFPreview'
import { Button } from '@/components/ui/button'

export default function DocumentPage() {
  const { id } = useParams()
  const { currentView, setCurrentView, sidebarCollapsed } = useDocumentStore()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [compilationTime, setCompilationTime] = useState(0)
  const [lineCount, setLineCount] = useState(0)

  // Fetch document
  const { data: document } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}`)
      if (!res.ok) throw new Error('Failed to fetch document')
      return res.json()
    },
  })

  // Set content when document loads (TanStack Query v5 - no onSuccess)
  useEffect(() => {
    if (document?.typstContent) {
      setContent(document.typstContent)
    }
  }, [document])

  // Auto-save hook
  const { isSaving, lastSaved, manualSave } = useAutoSave(id as string, content)

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <Sidebar documentId={id as string} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex">
          {/* Center Pane: AI Chat or Editor */}
          <div className="flex-1 flex flex-col border-r">
            {/* Toggle Button */}
            <div className="border-b p-2 flex gap-2">
              <Button
                size="sm"
                variant={currentView === 'chat' ? 'default' : 'outline'}
                onClick={() => setCurrentView('chat')}
              >
                AI Chat
              </Button>
              <Button
                size="sm"
                variant={currentView === 'editor' ? 'default' : 'outline'}
                onClick={() => setCurrentView('editor')}
              >
                Editor
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={manualSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {currentView === 'chat' ? (
                <AIChat documentId={id as string} />
              ) : (
                <TypstEditor
                  initialContent={content}
                  onChange={setContent}
                  onLineCountChange={setLineCount}
                />
              )}
            </div>
          </div>

          {/* Right Pane: PDF Preview */}
          <div className="w-1/2">
            <PDFPreview
              content={content}
              onError={setError}
              onCompilationTime={setCompilationTime}
            />
          </div>
        </div>

        {/* Bottom Error Panel */}
        <ErrorPanel error={error} onAskAIToFix={() => {/* TODO */}} />

        {/* Status Bar */}
        <StatusBar
          compilationTime={compilationTime}
          lineCount={lineCount}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
      </div>
    </div>
  )
}
```

**Layout Wrapper** (add EditorProvider):

```typescript
// apps/web/app/(dashboard)/documents/[id]/layout.tsx
import { EditorProvider } from '@/contexts/EditorContext'

export default function DocumentLayout({ children }: { children: React.ReactNode }) {
  return <EditorProvider>{children}</EditorProvider>
}
```

### Sidebar Component

```typescript
// apps/web/components/layout/Sidebar.tsx
import { useState } from 'react'
import { useDocumentStore } from '@/store/document-store'
import { DocumentList } from '@/components/documents/DocumentList'
import { SourceSidebar } from '@/components/sources/SourceSidebar'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Sidebar({ documentId }: { documentId: string }) {
  const { sidebarCollapsed, toggleSidebar } = useDocumentStore()

  if (sidebarCollapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-2">
        <Button size="sm" variant="ghost" onClick={toggleSidebar}>
          →
        </Button>
      </div>
    )
  }

  return (
    <div className="w-80 border-r flex flex-col">
      <div className="p-2 border-b flex justify-between items-center">
        <h2 className="font-semibold">10xStudent</h2>
        <Button size="sm" variant="ghost" onClick={toggleSidebar}>
          ←
        </Button>
      </div>

      <Tabs defaultValue="documents" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
          <TabsTrigger value="sources" className="flex-1">Sources</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="flex-1 overflow-auto">
          <DocumentList currentDocumentId={documentId} />
        </TabsContent>

        <TabsContent value="sources" className="flex-1 overflow-auto">
          <SourceSidebar documentId={documentId} />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-auto">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Status Bar Component

```typescript
// apps/web/components/layout/StatusBar.tsx
import { useQuery } from '@tanstack/react-query'

interface StatusBarProps {
  compilationTime: number
  lineCount: number
  isSaving: boolean
  lastSaved: string | null
}

export function StatusBar({
  compilationTime,
  lineCount,
  isSaving,
  lastSaved
}: StatusBarProps) {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/credits')
      if (!res.ok) throw new Error('Failed to fetch credits')
      return res.json()
    },
  })

  return (
    <div className="h-8 border-t bg-gray-50 px-4 flex items-center justify-between text-xs text-gray-600">
      <div className="flex items-center gap-4">
        <span>Credits: {user?.credits?.toLocaleString() || 0}</span>
        <span>
          {compilationTime > 0 ? `Compiled in ${compilationTime}ms` : 'Not compiled'}
        </span>
        <span className={lineCount >= 1000 ? 'text-red-600 font-semibold' : lineCount >= 900 ? 'text-yellow-600' : ''}>
          Lines: {lineCount}/1000
        </span>
      </div>

      <div>
        {isSaving ? 'Saving...' : lastSaved ? `Saved at ${lastSaved}` : ''}
      </div>
    </div>
  )
}
```

### Auto-Save Hook

```typescript
// apps/web/hooks/useAutoSave.ts
import { useEffect, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";

export function useAutoSave(documentId: string, content: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debouncedContent = useDebounce(content, 5000);

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typstContent: content }),
      });
      return res.json();
    },
    onMutate: () => setIsSaving(true),
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString());
    },
    onError: () => {
      setIsSaving(false);
      // Retry with exponential backoff
    },
  });

  useEffect(() => {
    if (debouncedContent) {
      saveMutation.mutate(debouncedContent);
    }
  }, [debouncedContent]);

  const manualSave = () => {
    saveMutation.mutate(content);
  };

  return { isSaving, lastSaved, manualSave };
}
```

### AI Chat Component

```typescript
// apps/web/components/chat/AIChat.tsx
import { useTypstChat } from '@/hooks/useTypstChat'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResearchDepthSelector } from './ResearchDepthSelector'

export function AIChat({ documentId }: { documentId: string }) {
  const [researchDepth, setResearchDepth] = useState<'quick' | 'deep'>('quick')
  const chat = useTypstChat(documentId, researchDepth)
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    chat.append({ role: 'user', content: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Research Depth Selector */}
      <div className="p-2 border-b">
        <ResearchDepthSelector value={researchDepth} onChange={setResearchDepth} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {chat.messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="text-sm">{message.content}</div>
          </div>
        ))}

        {chat.isLoading && (
          <div className="text-sm text-gray-500 italic">AI is thinking...</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Describe what you want to create..."
          disabled={chat.isLoading}
        />
        <Button onClick={handleSend} disabled={chat.isLoading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}
```

### ResearchDepthSelector Component

```typescript
// apps/web/components/chat/ResearchDepthSelector.tsx
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ResearchDepthSelectorProps {
  value: 'quick' | 'deep'
  onChange: (value: 'quick' | 'deep') => void
}

export function ResearchDepthSelector({ value, onChange }: ResearchDepthSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Research Depth</Label>
      <RadioGroup value={value} onValueChange={onChange as (value: string) => void}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="quick" id="quick" />
          <Label htmlFor="quick" className="text-sm font-normal cursor-pointer">
            Quick (3 sources, ~30s, 500 credits)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="deep" id="deep" />
          <Label htmlFor="deep" className="text-sm font-normal cursor-pointer">
            Deep (10 sources, ~2min, 2000 credits)
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}
```

### DocumentList Component

```typescript
// apps/web/components/documents/DocumentList.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DocumentCard } from './DocumentCard'
import { TemplateSelector } from './TemplateSelector'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DocumentListProps {
  currentDocumentId: string
}

export function DocumentList({ currentDocumentId }: DocumentListProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)

  // Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch('/api/documents')
      if (!res.ok) throw new Error('Failed to fetch documents')
      return res.json()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete document')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    },
  })

  const handleDelete = (id: string) => {
    setDocumentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete)
    }
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading documents...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={() => setShowTemplateSelector(true)} className="w-full">
          New Document
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {documents?.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No documents yet. Create your first document!
          </div>
        ) : (
          documents?.map((doc: any) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isActive={doc.id === currentDocumentId}
              onSelect={() => router.push(`/documents/${doc.id}`)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))
        )}
      </div>

      {/* Template Selector Modal */}
      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

### DocumentCard Component

```typescript
// apps/web/components/documents/DocumentCard.tsx
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DocumentCardProps {
  document: {
    id: string
    title: string
    updatedAt: string
  }
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function DocumentCard({ document, isActive, onSelect, onDelete }: DocumentCardProps) {
  const formattedDate = new Date(document.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{document.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{formattedDate}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

### TemplateSelector Component

```typescript
// apps/web/components/documents/TemplateSelector.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TEMPLATES } from '@/lib/templates' // From Spec 3

interface TemplateSelectorProps {
  open: boolean
  onClose: () => void
}

export function TemplateSelector({ open, onClose }: TemplateSelectorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = TEMPLATES.find((t) => t.id === templateId)
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New ${template?.name || 'Document'}`,
          typstContent: template?.content || '',
          citationFormat: 'apa',
        }),
      })
      if (!res.ok) throw new Error('Failed to create document')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      router.push(`/documents/${data.id}`)
      onClose()
    },
  })

  const handleCreate = () => {
    if (selectedTemplate) {
      createMutation.mutate(selectedTemplate)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a template to start your document
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors ${
                selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <h3 className="font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              {template.preview && (
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-48 object-cover rounded border"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedTemplate || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Document'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### SettingsPanel Component

```typescript
// apps/web/components/settings/SettingsPanel.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function SettingsPanel() {
  const queryClient = useQueryClient()
  const [citationFormat, setCitationFormat] = useState<'apa' | 'mla' | 'chicago'>('apa')
  const [researchDepth, setResearchDepth] = useState<'quick' | 'deep'>('quick')

  // Fetch user preferences
  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const res = await fetch('/api/preferences')
      if (!res.ok) throw new Error('Failed to fetch preferences')
      return res.json()
    },
  })

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setCitationFormat(preferences.defaultCitationFormat || 'apa')
      setResearchDepth(preferences.defaultResearchDepth || 'quick')
    }
  }, [preferences])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { citationFormat: string; researchDepth: string }) => {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultCitationFormat: data.citationFormat,
          defaultResearchDepth: data.researchDepth,
        }),
      })
      if (!res.ok) throw new Error('Failed to save preferences')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })

  const handleSave = () => {
    saveMutation.mutate({ citationFormat, researchDepth })
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Settings</h3>
      </div>

      {/* Citation Format */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Default Citation Format</Label>
        <RadioGroup value={citationFormat} onValueChange={(v) => setCitationFormat(v as any)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="apa" id="apa" />
            <Label htmlFor="apa" className="text-sm font-normal cursor-pointer">
              APA (American Psychological Association)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mla" id="mla" />
            <Label htmlFor="mla" className="text-sm font-normal cursor-pointer">
              MLA (Modern Language Association)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="chicago" id="chicago" />
            <Label htmlFor="chicago" className="text-sm font-normal cursor-pointer">
              Chicago Manual of Style
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Research Depth */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Default Research Depth</Label>
        <RadioGroup value={researchDepth} onValueChange={(v) => setResearchDepth(v as any)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="quick" id="settings-quick" />
            <Label htmlFor="settings-quick" className="text-sm font-normal cursor-pointer">
              Quick (3 sources, ~30s, 500 credits)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="deep" id="settings-deep" />
            <Label htmlFor="settings-deep" className="text-sm font-normal cursor-pointer">
              Deep (10 sources, ~2min, 2000 credits)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* LLM Provider (Display Only) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">LLM Provider</Label>
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
          Currently using: <span className="font-semibold">Gemini 2.0 Flash</span>
          <p className="text-xs text-gray-500 mt-1">
            (Provider selection will be available in a future update)
          </p>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
      </Button>

      {saveMutation.isSuccess && (
        <p className="text-sm text-green-600 text-center">Settings saved successfully!</p>
      )}
      {saveMutation.isError && (
        <p className="text-sm text-red-600 text-center">Failed to save settings</p>
      )}
    </div>
  )
}
```

### Client Tools (Updated for EditorContext)

**IMPORTANT**: Client tools must use `useEditor()` hook instead of accessing Zustand store.

```typescript
// Example: Insert text tool (from Spec 2)
import { useEditor } from "@/contexts/EditorContext";

export function useInsertTextTool() {
  const { editorView } = useEditor();

  return {
    insertText: (text: string, position?: number) => {
      if (!editorView) {
        console.warn("EditorView not available");
        return;
      }

      const pos = position ?? editorView.state.doc.length;
      editorView.dispatch({
        changes: { from: pos, insert: text },
      });
    },
  };
}
```

---

## 5. Architecture Decisions & Best Practices

### State Management Patterns

**1. Zustand for UI State Only**

Zustand should ONLY store serializable UI state. Mutable objects like EditorView violate Zustand principles and cause issues with persistence and reactivity.

✅ **Correct Usage:**

- Current document ID
- Sidebar collapsed state
- Current view (chat/editor)

❌ **Incorrect Usage:**

- EditorView instances
- CodeMirror state
- Complex mutable objects

**2. React Context for Mutable References**

Use React Context with `useRef` for mutable objects that don't trigger re-renders:

```typescript
// EditorContext holds EditorView reference
const editorViewRef = useRef<EditorView | null>(null);
```

**3. TanStack Query for Server State**

TanStack Query v5 removed callback props. Use `useEffect` or `queryClient.setQueryData` instead:

```typescript
// ❌ TanStack Query v4 (deprecated)
useQuery({
  queryKey: ["document", id],
  queryFn: fetchDocument,
  onSuccess: (data) => setContent(data.content), // Doesn't exist in v5
});

// ✅ TanStack Query v5 (correct)
const { data } = useQuery({
  queryKey: ["document", id],
  queryFn: fetchDocument,
});

useEffect(() => {
  if (data?.content) {
    setContent(data.content);
  }
}, [data]);
```

### Component Integration Patterns

**1. Auto-Save Hook Integration**

The `useAutoSave` hook must be called in the parent component and its state passed down:

```typescript
// In DocumentPage
const { isSaving, lastSaved, manualSave } = useAutoSave(id, content)

// Pass to StatusBar
<StatusBar isSaving={isSaving} lastSaved={lastSaved} />
```

**2. EditorView Access in Tools**

Client tools (from Spec 2) must use the `useEditor()` hook:

```typescript
// ❌ Old pattern (Zustand)
const { getEditorView } = useDocumentStore();
const editorView = getEditorView();

// ✅ New pattern (Context)
const { editorView } = useEditor();
```

**3. Provider Hierarchy**

Ensure proper provider nesting:

```
ClerkProvider (root layout)
  └─ QueryClientProvider (root layout)
      └─ EditorProvider (document layout)
          └─ DocumentPage
```

### References to Spec 0

This spec implements the following requirements from Spec 0 (MVP Requirements):

- **R-01**: User authentication (Clerk integration)
- **R-02**: Document CRUD operations (DocumentList, TemplateSelector)
- **R-03**: AI chat interface (AIChat component)
- **R-04**: Live PDF preview (PDFPreview integration)
- **R-05**: Source management (SourceSidebar integration)
- **R-06**: Auto-save functionality (useAutoSave hook)
- **R-07**: Credit tracking (StatusBar display)
- **R-08**: Settings management (SettingsPanel)

### Performance Considerations

1. **Debouncing**: Auto-save uses 5-second debounce to reduce API calls
2. **PDF Compilation**: 500ms debounce on content changes (from Spec 3)
3. **Query Caching**: TanStack Query caches server state automatically
4. **Lazy Loading**: Components load only when needed (modal dialogs)

### Error Handling Strategy

1. **Network Errors**: Show retry button with exponential backoff
2. **Compilation Errors**: Display in ErrorPanel with "Ask AI to Fix" option
3. **Auth Errors**: Redirect to sign-in page
4. **Credit Exhaustion**: Disable AI features, show upgrade prompt

---

## 6. Success Criteria (Measurable)

- **SC-01**: Authentication flow completes within 2 seconds.
- **SC-02**: Document list loads within 1 second.
- **SC-03**: Template selector opens within 500ms.
- **SC-04**: View toggle (chat ↔ editor) completes within 100ms.
- **SC-05**: Auto-save triggers within 5 seconds of last edit.
- **SC-06**: Status bar updates within 100ms of state changes.
- **SC-07**: Sidebar collapse/expand animates smoothly (300ms).

---

## 7. Edge Cases & Error Handling

### Authentication

- **EC-01**: If Clerk fails to load, show error and reload button.
- **EC-02**: If user session expires, redirect to sign-in.

### Document List

- **EC-03**: If no documents exist, show empty state with "Create Document" button.
- **EC-04**: If document load fails, show error and retry button.

### Auto-Save

- **EC-05**: If save fails, retry with exponential backoff (1s, 2s, 4s, 8s).
- **EC-06**: If all retries fail, show error and manual save button.

### Layout

- **EC-07**: If window is too small (<1024px), show warning to use larger screen.

---

## 8. Implementation Checklist

### Setup

- [ ] Install dependencies: `@clerk/nextjs`, `zustand`, `@tanstack/react-query`, `shadcn/ui`
- [ ] Configure Clerk API keys
- [ ] Set up shadcn/ui components

### Authentication

- [ ] Implement Clerk integration
- [ ] Implement sign-in/sign-up pages
- [ ] Implement protected routes

### Layout

- [ ] Implement main layout with 3 panes
- [ ] Implement sidebar with tabs
- [ ] Implement status bar
- [ ] Implement error panel
- [ ] Add EditorProvider wrapper in document layout

### Components

- [ ] Implement DocumentList component
- [ ] Implement DocumentCard component
- [ ] Implement TemplateSelector component
- [ ] Implement ResearchDepthSelector component
- [ ] Implement SettingsPanel component
- [ ] Implement AI chat
- [ ] Integrate editor (from Spec 3)
- [ ] Integrate preview (from Spec 3)
- [ ] Integrate source sidebar (from Spec 4)

### State Management

- [ ] Implement Zustand store (UI state only - no EditorView)
- [ ] Implement EditorContext and useEditor hook
- [ ] Integrate TanStack Query (use v5 API - no onSuccess callbacks)
- [ ] Implement auto-save hook
- [ ] Update DocumentPage to call useAutoSave
- [ ] Pass isSaving/lastSaved props to StatusBar
- [ ] Update client tools to use useEditor() hook

### Testing

- [ ] E2E tests for authentication flow
- [ ] E2E tests for document creation
- [ ] E2E tests for AI chat
- [ ] E2E tests for auto-save

---

## 9. Out of Scope

- Mobile responsive design
- Keyboard shortcuts (except Ctrl+S for save)
- Dark mode
- Accessibility (WCAG compliance)
- Internationalization (i18n)

---

## 11. Change Log

### Version 2.0 - State Management & Integration Fixes

**Critical Issues Fixed:**

1. **EditorView Removed from Zustand**
   - EditorView is mutable and violated Zustand principles
   - Moved to React Context (EditorContext)
   - Zustand now only stores UI state (sidebar collapsed, current view, current document ID)
   - Added `useEditor()` hook for accessing EditorView

2. **useAutoSave Hook Integration**
   - Hook now properly called in DocumentPage
   - StatusBar receives `isSaving` and `lastSaved` props from parent
   - Manual save button added to DocumentPage toolbar

3. **TanStack Query v5 API Compliance**
   - Removed deprecated `onSuccess` callback
   - Replaced with `useEffect` pattern for side effects
   - Added proper error handling with `if (!res.ok)` checks

4. **EditorContext Provider Added**
   - Created `contexts/EditorContext.tsx` with EditorProvider and useEditor hook
   - Added layout wrapper at `app/(dashboard)/documents/[id]/layout.tsx`
   - Updated client tools pattern to use `useEditor()` instead of Zustand

5. **Complete Component Implementations**
   - **ResearchDepthSelector**: Radio group for quick/deep research selection
   - **DocumentList**: Full CRUD with TanStack Query, delete confirmation dialog
   - **DocumentCard**: Individual document display with delete button
   - **TemplateSelector**: Modal dialog with template grid and preview images
   - **SettingsPanel**: User preferences for citation format, research depth, LLM provider

6. **StatusBar Props Fixed**
   - Now receives `isSaving`, `lastSaved`, `compilationTime`, `lineCount` as props
   - Removed incorrect `useAutoSave()` call from StatusBar
   - Added line count warning colors (yellow at 900, red at 1000)

**Architecture Improvements:**

- Added "Architecture Decisions & Best Practices" section (Section 5)
- Documented state management patterns (Zustand vs Context vs TanStack Query)
- Added references to Spec 0 requirements
- Documented provider hierarchy
- Added performance considerations and error handling strategy

**Updated Functional Requirements:**

- FR-48: Updated to specify UI state only in Zustand
- FR-50: Changed to specify EditorContext usage
- FR-51: Added for TanStack Query server state
- FR-52: Added for EditorContext requirement

**Implementation Checklist Updates:**

- Added EditorProvider wrapper task
- Added specific component implementation tasks
- Added state management verification tasks
- Added client tools update task

---

## 12. Completion

This is the final spec. After implementing all 5 specs:

1. Run full E2E test suite
2. Verify all acceptance criteria from original MVP spec
3. Deploy to production
4. Monitor for errors and performance issues

---

## 13. Acceptance Criteria (All Specs)

The MVP is considered **COMPLETE** when:

1. ✅ User can sign in with Clerk
2. ✅ User can create a document by selecting a template
3. ✅ User can chat with AI to refine requirements
4. ✅ AI searches the web and generates Typst document
5. ✅ User can edit Typst source directly in CodeMirror
6. ✅ User sees live PDF preview (500ms debounce)
7. ✅ Sources appear in sidebar with metadata
8. ✅ AI auto-inserts citations as footnotes
9. ✅ Bibliography auto-generated in chosen format
10. ✅ Document auto-saves every 5 seconds
11. ✅ Credits tracked and deducted based on token usage
12. ✅ User blocked from AI operations when out of credits
13. ✅ Compilation errors shown in bottom panel
14. ✅ AI can auto-fix errors (with user approval)
15. ✅ All success criteria from Specs 1-5 are met
16. ✅ Code passes lint, type-check, and build without errors
