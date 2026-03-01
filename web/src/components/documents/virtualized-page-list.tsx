"use client";

import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import type { TypstCompiler, PageInfo } from "@/hooks/use-typst";

/** Gap between pages in pixels */
const PAGE_GAP_PX = 30;

interface PageSlotProps {
  pageIndex: number;
  /** Page width in points */
  widthPt: number;
  /** Page height in points */
  heightPt: number;
  /** Render resolution: physical pixels per typographic point (HiDPI-aware) */
  pixelPerPt: number;
  /** Zoom level as a fraction (e.g. 1.0 = 100%, 0.5 = 50%). Applied via CSS. */
  zoomScale: number;
  compiler: TypstCompiler;
  /** Callback when page rendering completes */
  onRendered?: (pageIndex: number) => void;
}

/**
 * A single page slot that renders on-demand when visible.
 * Uses IntersectionObserver for lazy loading.
 */
const PageSlot = memo(function PageSlot({
  pageIndex,
  widthPt,
  heightPt,
  pixelPerPt,
  zoomScale,
  compiler,
  onRendered,
}: PageSlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  // Track the pixelPerPt used for the current render to detect resolution changes
  const renderedAtPptRef = useRef<number | null>(null);

  /**
   * The canvas physical dimensions — this is the render resolution.
   * We render at full HiDPI quality regardless of zoom level.
   */
  const canvasWidth = Math.ceil(widthPt * pixelPerPt);
  const canvasHeight = Math.ceil(heightPt * pixelPerPt);

  /**
   * The CSS display size at 100% zoom (1 CSS px per logical px).
   * The canvas is then scaled down via CSS transform to apply zoom.
   * This keeps the render buffer crisp at all zoom levels.
   */
  const cssWidth = widthPt * (pixelPerPt / (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
  const cssHeight = heightPt * (pixelPerPt / (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));

  /** Outer container reserves space as if the page is displayed at zoomScale */
  const displayWidth = cssWidth * zoomScale;
  const displayHeight = cssHeight * zoomScale;

  // IntersectionObserver to detect visibility
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "400px" } // Reduced buffer for better memory usage while maintaining smooth scrolling
    );

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Reset rendered state when pixelPerPt changes (device pixel ratio or base resolution change)
  useEffect(() => {
    if (renderedAtPptRef.current !== null && renderedAtPptRef.current !== pixelPerPt) {
      setIsRendered(false);
      renderedAtPptRef.current = null;
    }
  }, [pixelPerPt]);

  // Render when visible and not yet rendered (or needs re-render due to zoom)
  useEffect(() => {
    if (!isVisible || isRendered || isRendering) return;

    const render = async () => {
      setIsRendering(true);
      try {
        const result = await compiler.renderPage(pageIndex, pixelPerPt);
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && result.bitmap) {
          // Use drawImage with ImageBitmap (zero-copy from worker)
          ctx.drawImage(result.bitmap, 0, 0);
          // Close the bitmap to free GPU memory
          result.bitmap.close();
          renderedAtPptRef.current = pixelPerPt;
          setIsRendered(true);
          onRendered?.(pageIndex);
        }
      } catch (err) {
        console.error(`[PageSlot] Failed to render page ${pageIndex}:`, err);
      } finally {
        setIsRendering(false);
      }
    };

    render();
  }, [isVisible, isRendered, isRendering, pageIndex, pixelPerPt, compiler, onRendered]);

  return (
    <div
      className="page-slot relative"
      style={{
        width: displayWidth,
        height: displayHeight,
        marginBottom: PAGE_GAP_PX,
      }}
    >
      {/*
        The canvas renders at full HiDPI resolution (canvasWidth × canvasHeight).
        CSS width/height set it to logical pixels (cssWidth × cssHeight at 100% zoom).
        transform: scale(zoomScale) shrinks/grows it visually without re-rendering.
        transform-origin: top left keeps it anchored to the container top-left.
      */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="block rounded shadow-lg"
        style={{
          width: cssWidth,
          height: cssHeight,
          backgroundColor: "#ffffff",
          transformOrigin: "top left",
          transform: `scale(${zoomScale})`,
        }}
      />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="text-sm text-muted-foreground">Rendering...</div>
        </div>
      )}
      {!isRendered && !isRendering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">
            Page {pageIndex + 1}
          </div>
        </div>
      )}
    </div>
  );
});

interface VirtualizedPageListProps {
  compiler: TypstCompiler;
  pageInfo: PageInfo;
  /** Render resolution: physical pixels per typographic point (HiDPI-aware) */
  pixelPerPt: number;
  /** Zoom level as a percentage (e.g. 100 = 100%, 50 = 50%) */
  zoom: number;
  /** Increment this to force re-render of all pages */
  version?: number;
}

/**
 * Virtualized list of Typst pages with lazy loading.
 * Only renders pages that are visible in the viewport.
 * Zoom is applied via CSS transform — pages are always rendered at full
 * HiDPI resolution regardless of zoom level.
 */
export function VirtualizedPageList({
  compiler,
  pageInfo,
  pixelPerPt,
  zoom,
  version = 0,
}: VirtualizedPageListProps) {
  const [renderedCount, setRenderedCount] = useState(0);
  const zoomScale = zoom / 100;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Reset rendered count when version changes (new compilation)
  useEffect(() => {
    setRenderedCount(0);
  }, [version]);

  const handlePageRendered = useCallback((pageIndex: number) => {
    setRenderedCount((prev) => Math.max(prev, pageIndex + 1));
  }, []);

  // Calculate total height for scroll container using display dimensions (after zoom)
  const totalHeight = pageInfo.heights.reduce(
    (sum, h) => sum + (h * pixelPerPt / dpr) * zoomScale + PAGE_GAP_PX,
    0
  );

  return (
    <div
      className="flex flex-col items-center p-8"
      style={{ minHeight: totalHeight }}
    >
      {Array.from({ length: pageInfo.count }, (_, i) => (
        <PageSlot
          key={`${version}-${i}`}
          pageIndex={i}
          widthPt={pageInfo.widths[i] ?? 595.28} // Default A4 width
          heightPt={pageInfo.heights[i] ?? 841.89} // Default A4 height
          pixelPerPt={pixelPerPt}
          zoomScale={zoomScale}
          compiler={compiler}
          onRendered={handlePageRendered}
        />
      ))}
      {renderedCount < pageInfo.count && (
        <div className="text-xs text-muted-foreground mt-2">
          {renderedCount} of {pageInfo.count} pages rendered
        </div>
      )}
    </div>
  );
}
