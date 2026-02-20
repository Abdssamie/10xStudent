'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useDocument, useDocumentContent, useUpdateDocumentContent } from '@/hooks/use-document';
import { Editor } from '@/components/documents/editor';
import type { EditorHandle } from '@/components/documents/editor';
import { EditorMenuBar } from '@/components/documents/editor-menu-bar';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DocumentEditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  const { data: document, isLoading: isLoadingDoc } = useDocument(documentId);
  const { data: documentContent, isLoading: isLoadingContent } = useDocumentContent(documentId);
  const updateContent = useUpdateDocumentContent(documentId);

  // Track current content in a ref — the Editor owns its own state internally,
  // we only need this for the save mutation.
  const contentRef = useRef(documentContent?.content ?? '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef<EditorHandle | null>(null);

  // Sync unsaved-change indicator with window unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleContentChange = (newContent: string, unsaved: boolean) => {
    contentRef.current = newContent;
    setHasUnsavedChanges(unsaved);
  };

  const handleSave = () => {
    updateContent.mutate(contentRef.current, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
        editorRef.current?.markAsSaved();
        toast.success('Document saved');
      },
    });
  };

  if (isLoadingDoc || isLoadingContent) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document || !documentContent) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Document not found</h2>
          <p className="text-muted-foreground mb-4">The document you are looking for does not exist.</p>
          <Link href="/documents">
            <Button>Back to Documents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <EditorMenuBar
        title={document.title}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={updateContent.isPending}
        onSave={handleSave}
        onExportPdf={() => {
          console.log('Export PDF clicked');
        }}
      />
      <div className="flex-1 overflow-hidden">
        <Editor
          ref={editorRef}
          documentId={document.id}
          docType={document.docType}
          initialContent={documentContent.content}
          onContentChange={handleContentChange}
          onExportPdf={() => {
            console.log('Export PDF clicked');
          }}
        />
      </div>
    </div>
  );
}
