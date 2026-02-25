"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import type { TypstCompiler, PageInfo } from "@/hooks/use-typst";
import { VirtualizedPageList } from "./virtualized-page-list";

/** Pixels per point - Typst uses points (pt), DOM uses pixels */
const PIXEL_PER_PT = 1.5;

interface DocumentPreviewProps {
  compiler: TypstCompiler | null;
  pageInfo: PageInfo | null;
  error: string | null;
  docType: string;
  onExportPdf: () => void;
}

export const DocumentPreview = React.memo(function DocumentPreview({
  compiler,
  pageInfo,
  error,
  docType,
  onExportPdf,
}: DocumentPreviewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-muted/50 px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pageInfo && (
            <span className="text-xs text-muted-foreground">
              {pageInfo.count} page{pageInfo.count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto">
        {error ? (
          <div className="p-8">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 w-full max-w-2xl mx-auto">
              <h3 className="mb-2 font-semibold text-destructive">
                Compilation Error
              </h3>
              <pre className="whitespace-pre-wrap text-sm text-destructive/90">
                {error}
              </pre>
            </div>
          </div>
        ) : compiler && pageInfo ? (
          <VirtualizedPageList
            compiler={compiler}
            pageInfo={pageInfo}
            pixelPerPt={PIXEL_PER_PT}
          />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Compiling...</p>
          </div>
        )}
      </div>
    </div>
  );
});
