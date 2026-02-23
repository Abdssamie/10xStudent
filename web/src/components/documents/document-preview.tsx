"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

interface DocumentPreviewProps {
  svg: string;
  error: string | null;
  docType: string;
  onExportPdf: () => void;
}

export const DocumentPreview = React.memo(function DocumentPreview({
  svg,
  error,
  docType,
  onExportPdf,
}: DocumentPreviewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-muted/50 px-4 h-12 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto">
        <div className="flex justify-center p-8 min-w-full">
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
      </div>
    </div>
  );
});
