"use client";

import { Download, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface DocumentPreviewProps {
  svg: string;
  error: string | null;
  docType: string;
  onExportPdf: () => void;
}

export function DocumentPreview({
  svg,
  error,
  docType,
  onExportPdf,
}: DocumentPreviewProps) {
  return (
    <div className="flex h-full flex-col">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        // zoomAnimation={{ disabled: false, size: 0, animationTime: 0 }}
        doubleClick={{ disabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="border-b bg-muted/50 px-4 h-12 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => zoomIn()}
                  className="h-8 w-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => zoomOut()}
                  className="h-8 w-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => resetTransform()}
                  className="h-8 w-8"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={onExportPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-hidden relative cursor-grab active:cursor-grabbing">
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
              >
                <div className="flex justify-center p-8 min-w-full min-h-full">
                  {error ? (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 w-full max-w-2xl">
                      <h3 className="mb-2 font-semibold text-destructive">
                        Compilation Error
                      </h3>
                      <pre className="whitespace-pre-wrap text-sm text-destructive/90">
                        {error}
                      </pre>
                    </div>
                  ) : svg ? (
                    <div
                      className="typst-preview"
                      style={{
                        color: "black",
                        backgroundColor: "transparent",
                        width: docType === "auto" ? "100%" : "auto",
                      }}
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <p className="text-muted-foreground">Compiling...</p>
                    </div>
                  )}
                </div>
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
