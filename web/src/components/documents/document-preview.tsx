"use client";

import { Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState, useCallback, useRef, useEffect } from "react";
import type { TypstCompiler, PageInfo } from "@/hooks/use-typst";
import { VirtualizedPageList } from "./virtualized-page-list";

/** Base pixels per point at 100% zoom */
const BASE_PIXEL_PER_PT = 2.0;

/** Zoom level presets (percentage) */
const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200, 300, 400];
const MIN_ZOOM = ZOOM_STEPS[0]!;
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]!;
const DEFAULT_ZOOM = 100;

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Snap to the nearest zoom step when using buttons */
function nextZoomStep(current: number, direction: "in" | "out"): number {
  if (direction === "in") {
    const next = ZOOM_STEPS.find((s) => s > current);
    return next ?? MAX_ZOOM;
  }
  const reversed = [...ZOOM_STEPS].reverse();
  const prev = reversed.find((s) => s < current);
  return prev ?? MIN_ZOOM;
}

interface DocumentPreviewProps {
  compiler: TypstCompiler | null;
  pageInfo: PageInfo | null;
  error: string | null;
  docType: string;
  onExportPdf: () => void;
  /** Increment to force re-render pages after recompilation */
  compileVersion?: number;
}

export const DocumentPreview = React.memo(function DocumentPreview({
  compiler,
  pageInfo,
  error,
  docType,
  onExportPdf,
  compileVersion = 0,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const pixelPerPt = BASE_PIXEL_PER_PT * (zoom / 100);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => nextZoomStep(z, "in"));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => nextZoomStep(z, "out"));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Ctrl+Scroll (or Cmd+Scroll on Mac) to zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      // deltaY < 0 = scroll up = zoom in, deltaY > 0 = scroll down = zoom out
      const delta = -e.deltaY;
      const step = Math.abs(delta) > 50 ? 10 : 5;
      setZoom((z) => clamp(z + (delta > 0 ? step : -step), MIN_ZOOM, MAX_ZOOM));
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 min-w-[3.5rem] text-xs font-mono tabular-nums"
            onClick={handleZoomReset}
            title="Reset zoom"
          >
            {zoom}%
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto"
      >
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
            pixelPerPt={pixelPerPt}
            version={compileVersion}
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
