'use client';

import { useEffect, useState, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { typst } from 'codemirror-lang-typst';
import { $typst } from '@myriaddreamin/typst.ts';
import { useDebouncedCallback } from 'use-debounce';
import { EditorView } from '@codemirror/view';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTypst } from '@/hooks/use-typst';
import { processTypstSvg } from '@/utils/typst-svg-processor';
import { DocumentPreview } from './document-preview';
import { useIsMobile } from '@/hooks/use-mobile';
import { FormattingToolbar } from './formatting-toolbar';

interface EditorProps {
  title: string;
  documentId: string;
  docType: string;
  initialContent: string;
  onSave: (content: string) => void;
  onExportPdf: () => void;
}

export function Editor({ title, docType, initialContent, onSave, onExportPdf }: EditorProps) {
  const [content, setContent] = useState(initialContent);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { isLoading, isReady, error: initError } = useTypst();
  const isMobile = useIsMobile();
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    onSave(value);
  }, 2000);

  const compile = useDebouncedCallback(async (source: string, paperType: string) => {
    if (!isReady) return;

    try {
      setError(null);
      let compileContent = source;
      if (paperType !== 'auto') {
        compileContent = `#set page(paper: "${paperType}")\n` + source;
      }
      const result = await $typst.svg({ mainContent: compileContent });

      const processedSvg = processTypstSvg(result);

      setSvg(processedSvg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation error');
    }
  }, 500);

  useEffect(() => {
    if (isReady && content) {
      compile(content, docType);
    }
  }, [content, isReady, compile, docType]);

  const handleChange = (value: string) => {
    setContent(value);
    debouncedSave(value);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading Typst compiler...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 font-semibold text-destructive">Failed to load compiler</h3>
          <p className="text-sm text-muted-foreground">{initError}</p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="flex-1 w-full h-full overflow-hidden">
      <ResizablePanel defaultSize={isMobile ? 100 : 50} minSize={30} className="min-w-0">
        <Tabs defaultValue="source" className="flex h-full flex-col w-full min-w-0 mb-0">
          <div className="border-b bg-muted/50 h-12 shrink-0">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-semibold truncate">{title}</h1>
                <FormattingToolbar editorView={editorRef.current?.view || null} />
              </div>
              <TabsList variant="line" className="h-7">
                <TabsTrigger value="source" className="text-xs px-2 h-6">Source</TabsTrigger>
                <TabsTrigger value="citations" className="text-xs px-2 h-6">Citations</TabsTrigger>
                <TabsTrigger value="ai-agent" className="text-xs px-2 h-6">AI Agent</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <TabsContent value="source" className="flex-1 overflow-hidden min-h-0 min-w-0 m-0 p-0 w-full relative">
            <div className="absolute inset-0 w-full h-full mt-0 pt-0">
              <CodeMirror
                ref={editorRef}
                value={content}
                height="100%"
                theme={vscodeDark}
                extensions={[typst(), EditorView.lineWrapping]}
                onChange={handleChange}
                className="pt-0 mt-0 h-full text-sm w-full [&_.cm-editor]:h-full [&_.cm-editor]:p-0 [&_.cm-scroller]:overflow-auto"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: false,
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value="citations" className="flex-1 overflow-hidden min-h-0 min-w-0 m-0">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Citations coming soon
            </div>
          </TabsContent>
          <TabsContent value="ai-agent" className="flex-1 overflow-hidden min-h-0 min-w-0 m-0">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              AI Agent coming soon
            </div>
          </TabsContent>
        </Tabs>
      </ResizablePanel>

      {!isMobile && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={15} className="min-w-0">
            <DocumentPreview svg={svg} error={error} docType={docType} onExportPdf={onExportPdf} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
