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
  documentId: string;
  docType: string;
  initialContent: string;
  onSave: (content: string) => void;
  onExportPdf: () => void;
}

export function Editor({ title, documentId, docType, initialContent, onSave, onExportPdf }: EditorProps) {
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

  const compile = useDebouncedCallback(async (source: string, paperType: string) => {
    if (!isReady) return;

    try {
      setError(null);
      let compileContent = source;
      if (paperType !== 'auto') {
        compileContent = `#set page(paper: "${paperType}")\n` + source;
      }
      const result = await $typst.svg({ mainContent: compileContent });

      // Add visual gaps and shadows between pages
      const gapSize = 30; // 30px gap between pages
      
      let processedSvg = result;
      
      const totalPages = (result.match(/<g class="typst-page"/g) || []).length;
      
      // We will match the start of each page and wrap it in a new `<g>` container
      // This allows us to translate the entire page down, add a shadow/background,
      // and keep the original page content intact.
      const regex = /<g class="typst-page" transform="translate\(([^,]+),\s*([^)]+)\)" data-tid="([^"]+)" data-page-width="([^"]+)" data-page-height="([^"]+)">/g;
      
      let match;
      let pageIndex = 0;
      let replacements = [];
      
      while ((match = regex.exec(result)) !== null) {
        const fullMatch = match[0];
        const x = match[1] || '0';
        const y = match[2] || '0';
        const tid = match[3] || '';
        const w = match[4] || '0';
        const h = match[5] || '0';
        
        const yOffset = parseFloat(y);
        const totalGap = pageIndex * gapSize;
        const newY = yOffset + totalGap;
        
        const replacement = `<g class="typst-page-wrapper" transform="translate(${x}, ${newY})">
          <rect width="${w}" height="${h}" fill="white" class="shadow-md" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)) drop-shadow(0 10px 15px rgba(0,0,0,0.05));" />
          <g class="typst-page" transform="translate(0, 0)" data-tid="${tid}" data-page-width="${w}" data-page-height="${h}">`;
          
        replacements.push({ find: fullMatch, replace: replacement });
        pageIndex++;
      }
      
      // Apply replacements
      for (const rep of replacements) {
        processedSvg = processedSvg.replace(rep.find, rep.replace);
      }
      
      // Because we added an opening <g class="typst-page-wrapper">, we need to add a closing </g>
      // The easiest way is to add it right before the next typst-page-wrapper or right before the final </svg>
      // We look for </g>\n immediately followed by <g class="typst-page-wrapper" or </svg>
      // The Typst generated SVG usually has a flat hierarchy for pages, so this works nicely.
      processedSvg = processedSvg.replace(/(<\/g>\n)(?=<g class="typst-page-wrapper"|<\/svg>)/g, '$1</g>\n');
      
      // Update the overall SVG viewBox to account for the gaps
      if (totalPages > 1) {
        const totalAddedHeight = (totalPages - 1) * gapSize;
        
        // Find and replace the viewBox height
        processedSvg = processedSvg.replace(/viewBox="0 0 ([^ ]+) ([^"]+)"/, (m, vw, vh) => {
          const newHeight = parseFloat(vh) + totalAddedHeight;
          return `viewBox="0 0 ${vw} ${newHeight}"`;
        });
        
        // Find and replace the hardcoded SVG height
        processedSvg = processedSvg.replace(/<svg[^>]+height="([^"]+)"/, (m, h) => {
          const newHeight = parseFloat(h) + totalAddedHeight;
          return m.replace(`height="${h}"`, `height="${newHeight}"`);
        });
      }

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

      <ResizablePanel defaultSize={50} minSize={15}>
        <div className="flex h-full flex-col">
          <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onExportPdf}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 bg-slate-100 dark:bg-slate-900">
            <div className="flex justify-center p-8">
              {error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 w-full max-w-2xl">
                  <h3 className="mb-2 font-semibold text-destructive">Compilation Error</h3>
                  <pre className="whitespace-pre-wrap text-sm text-destructive/90">{error}</pre>
                </div>
              ) : svg ? (
                <div
                  className="typst-preview"
                  style={{
                    color: 'black',
                    backgroundColor: 'transparent',
                    width: docType === 'auto' ? '100%' : 'auto',
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
