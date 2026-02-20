'use client';

import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { $typst } from '@myriaddreamin/typst.ts';
import { useDebouncedCallback } from 'use-debounce';
import { Download } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTypst } from '@/hooks/use-typst';

interface EditorProps {
  title: string;
  initialContent: string;
  onSave: (content: string) => void;
  onExportPdf: () => void;
}

export function Editor({ title, initialContent, onSave, onExportPdf }: EditorProps) {
  const [content, setContent] = useState(initialContent);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { isLoading, isReady, error: initError } = useTypst();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    onSave(value);
  }, 2000);

  const compile = useDebouncedCallback(async (source: string) => {
    if (!isReady) return;

    try {
      setError(null);
      const result = await $typst.svg({ mainContent: source });
      setSvg(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation error');
    }
  }, 500);

  useEffect(() => {
    if (isReady && content) {
      compile(content);
    }
  }, [content, isReady, compile]);

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
    <ResizablePanelGroup orientation="horizontal" className="flex-1" style={{ height: '100%' }}>
      <ResizablePanel defaultSize={50} minSize={30}>
        <Tabs defaultValue="source" className="flex h-full flex-col">
          <div className="border-b bg-muted/50 px-4 py-2">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold truncate mr-4">{title}</h1>
              <TabsList variant="line" className="h-7">
                <TabsTrigger value="source" className="text-xs px-2 h-6">Source</TabsTrigger>
                <TabsTrigger value="citations" className="text-xs px-2 h-6">Citations</TabsTrigger>
                <TabsTrigger value="ai-agent" className="text-xs px-2 h-6">AI Agent</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <TabsContent value="source" className="flex-1 overflow-hidden m-0">
            <CodeMirror
              value={content}
              height="100%"
              theme={vscodeDark}
              onChange={handleChange}
              className="h-full text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                foldGutter: false,
              }}
            />
          </TabsContent>
          <TabsContent value="citations" className="flex-1 overflow-hidden m-0">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Citations coming soon
            </div>
          </TabsContent>
          <TabsContent value="ai-agent" className="flex-1 overflow-hidden m-0">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              AI Agent coming soon
            </div>
          </TabsContent>
        </Tabs>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="flex h-full flex-col">
          <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <Button variant="outline" size="sm" onClick={onExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
          <ScrollArea className="flex-1 bg-white dark:bg-slate-950">
            <div className="p-8">
              {error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <h3 className="mb-2 font-semibold text-destructive">Compilation Error</h3>
                  <pre className="whitespace-pre-wrap text-sm text-destructive/90">{error}</pre>
                </div>
              ) : svg ? (
                <div
                  className="typst-preview"
                  style={{
                    color: 'black',
                    backgroundColor: 'white',
                  }}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-muted-foreground">Compiling...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
