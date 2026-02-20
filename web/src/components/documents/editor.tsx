"use client";

import {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import CodeMirror, {
  ReactCodeMirrorRef,
  EditorView,
} from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { markdown } from "@codemirror/lang-markdown";
import { useDebouncedCallback } from "use-debounce";
import { history } from "@codemirror/commands";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTypst } from "@/hooks/use-typst";
import { processTypstSvg } from "@/utils/typst-svg-processor";
import { DocumentPreview } from "./document-preview";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormattingToolbar } from "./formatting-toolbar";

interface EditorProps {
  documentId: string;
  docType: string;
  initialContent: string;
  onContentChange: (content: string, hasUnsavedChanges: boolean) => void;
  onExportPdf: () => void;
}

export interface EditorHandle {
  markAsSaved: () => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { docType, initialContent, onContentChange, onExportPdf },
  ref,
) {
  const [content, setContent] = useState(initialContent);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { isLoading, isReady, error: initError, compiler } = useTypst();
  const isMobile = useIsMobile();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const compileAbortRef = useRef<AbortController | null>(null);
  const savedContentRef = useRef(initialContent);

  useEffect(() => {
    setContent(initialContent);
    savedContentRef.current = initialContent;
  }, [initialContent]);

  useImperativeHandle(
    ref,
    () => ({
      markAsSaved: () => {
        savedContentRef.current = content;
      },
    }),
    [content],
  );

  const compile = useDebouncedCallback(
    async (source: string, paperType: string) => {
      if (!isReady || !compiler) return;

      // Cancel previous compilation
      if (compileAbortRef.current) {
        compileAbortRef.current.abort();
      }
      compileAbortRef.current = new AbortController();

      try {
        setError(null);
        let compileContent = source;
        if (paperType !== "auto") {
          compileContent = `#set page(paper: "${paperType}")\n` + source;
        }
        // compile() routes through postMessage to the Web Worker
        const result = await compiler.compile(compileContent);

        if (compileAbortRef.current.signal.aborted) return;

        const processedSvg = processTypstSvg(result);
        setSvg(processedSvg);
      } catch (err) {
        if (compileAbortRef.current?.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Compilation error");
      }
    },
    500,
  );

  useEffect(() => {
    if (isReady && content) {
      compile(content, docType);
    }

    return () => {
      // Cleanup on unmount
      if (compileAbortRef.current) {
        compileAbortRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isReady, docType]); // Removed 'compile' from dependencies

  const handleChange = (value: string) => {
    setContent(value);
    const hasUnsavedChanges = value !== savedContentRef.current;
    onContentChange(value, hasUnsavedChanges);
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
          <h3 className="mb-2 font-semibold text-destructive">
            Failed to load compiler
          </h3>
          <p className="text-sm text-muted-foreground">{initError}</p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="flex-1 w-full h-full overflow-hidden">
      <ResizablePanel
        defaultSize={isMobile ? 100 : 50}
        minSize={30}
        className="min-w-0"
      >
        <div className="flex h-full flex-col w-full min-w-0">
          <div className="border-b bg-muted/50 h-12 shrink-0">
            <div className="flex items-center h-full px-4">
              <FormattingToolbar editorView={editorRef.current?.view || null} />
            </div>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 min-w-0 w-full relative">
            <div className="absolute inset-0 w-full h-full">
              <CodeMirror
                ref={editorRef}
                value={content}
                height="100%"
                theme={vscodeDark}
                extensions={[markdown(), history(), EditorView.lineWrapping]}
                onChange={handleChange}
                className="h-full text-sm w-full [&_.cm-editor]:h-full [&_.cm-editor]:p-0 [&_.cm-scroller]:overflow-auto"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: false,
                }}
              />
            </div>
          </div>
        </div>
      </ResizablePanel>

      {!isMobile && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={15} className="min-w-0">
            <DocumentPreview
              svg={svg}
              error={error}
              docType={docType}
              onExportPdf={onExportPdf}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
});
