'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useDocument, useDocumentContent, useUpdateDocumentContent } from '@/hooks/use-document';
import { Editor } from '@/components/documents/editor';
import Link from 'next/link';

export default function DocumentEditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  const { data: document, isLoading: isLoadingDoc } = useDocument(documentId);
  const { data: documentContent, isLoading: isLoadingContent } = useDocumentContent(documentId);
  const updateContent = useUpdateDocumentContent(documentId);

  const [content, setContent] = useState('');

  useEffect(() => {
    if (documentContent?.content) {
      setContent(documentContent.content);
    }
  }, [documentContent]);

  const handleSave = (newContent: string) => {
    updateContent.mutate(newContent);
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
    <div className="h-[calc(100vh-10rem)]">
      <Editor
        title={document.title}
        initialContent={content}
        onSave={handleSave}
        onExportPdf={() => {
          console.log('Export PDF clicked');
        }}
      />
    </div>
  );
}
