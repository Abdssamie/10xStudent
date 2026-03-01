/**
 * Typst Compilation Web Worker (bundled by Next.js/Turbopack)
 *
 * This worker owns the $typst instance so all WASM execution is off the main thread.
 *
 * Message protocol:
 *
 * Main -> Worker:
 *   { type: 'init'; compilerUrl: string; rendererUrl: string }
 *   { type: 'compile'; id: number; source: string }
 *   { type: 'compile-vector'; id: number; source: string }
 *   { type: 'render-page'; id: number; pageOffset: number; pixelPerPt: number }
 *
 * Worker -> Main:
 *   { type: 'ready' }
 *   { type: 'init-error'; message: string }
 *   { type: 'result'; id: number; svg: string }
 *   { type: 'compile-error'; id: number; message: string; diagnostics: TypstDiagnostic[] }
 *   { type: 'vector-result'; id: number; pageCount: number; pageHeights: number[]; pageWidths: number[] }
 *   { type: 'page-result'; id: number; bitmap: ImageBitmap; width: number; height: number }
 */

/** A parsed Typst compiler diagnostic (error or warning). */
export interface TypstDiagnostic {
    severity: 'error' | 'warning' | 'info';
    message: string;
    hints: string[];
}

/**
 * Parse the Rust Debug-formatted diagnostic string from the Typst WASM compiler.
 *
 * The raw string looks like:
 *   [SourceDiagnostic { severity: Error, span: Span(123), message: "unknown variable: foo", trace: [], hints: [] }]
 *
 * Returns an empty array when the string doesn't match the expected format.
 */
function parseTypstDiagnostics(raw: string): TypstDiagnostic[] {
    const diagnostics: TypstDiagnostic[] = [];

    // Match each SourceDiagnostic { ... } block
    const diagPattern = /SourceDiagnostic\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = diagPattern.exec(raw)) !== null) {
        const body = match[1] ?? '';

        // Extract severity
        const severityMatch = /severity:\s*(\w+)/.exec(body);
        const rawSeverity = severityMatch?.[1]?.toLowerCase() ?? 'error';
        const severity: TypstDiagnostic['severity'] =
            rawSeverity === 'warning' ? 'warning'
            : rawSeverity === 'info' ? 'info'
            : 'error';

        // Extract message (quoted string)
        const messageMatch = /message:\s*"((?:[^"\\]|\\.)*)"/.exec(body);
        const message = messageMatch?.[1]?.replace(/\\"/g, '"') ?? raw.trim();

        // Extract hints array — hints: ["hint one", "hint two"]
        const hintsMatch = /hints:\s*\[([^\]]*)\]/.exec(body);
        const hints: string[] = [];
        if (hintsMatch?.[1]) {
            const hintPattern = /"((?:[^"\\]|\\.)*)"/g;
            let hintMatch: RegExpExecArray | null;
            while ((hintMatch = hintPattern.exec(hintsMatch[1])) !== null) {
                hints.push(hintMatch[1]?.replace(/\\"/g, '"') ?? '');
            }
        }

        diagnostics.push({ severity, message, hints });
    }

    return diagnostics;
}

/**
 * Convert an error thrown by the Typst WASM into a diagnostic list.
 * Falls back to a single synthetic diagnostic when the string isn't parseable.
 */
function errorToDiagnostics(err: unknown): TypstDiagnostic[] {
    const raw = err instanceof Error ? err.message : String(err);
    const parsed = parseTypstDiagnostics(raw);
    if (parsed.length > 0) return parsed;
    // Fallback: wrap the raw message as a single error
    return [{ severity: 'error', message: raw, hints: [] }];
}

import { $typst } from '@myriaddreamin/typst.ts';
import { preloadFontAssets } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';
import type { TypstRenderer, RenderSession } from '@myriaddreamin/typst.ts/dist/esm/renderer.mjs';
import { kObject } from '@myriaddreamin/typst.ts/dist/esm/internal.types.mjs';

// Type augmentation for kObject access
interface WithKObject<T> {
    [kObject]?: T;
}

type RenderSessionWithKObject = RenderSession & WithKObject<{ free?: () => void }>;
type TypstRendererWithKObject = TypstRenderer & WithKObject<{ free?: () => void }>;

// Conditional logging - only log in development
const DEBUG = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
const log = {
    debug: DEBUG ? console.debug.bind(console) : () => {},
    info: DEBUG ? console.info.bind(console) : () => {},
    log: DEBUG ? console.log.bind(console) : () => {},
    warn: console.warn.bind(console), // Always show warnings
    error: console.error.bind(console), // Always show errors
};

interface PageInfoItem {
    pageOffset: number;
    width: number;
    height: number;
}

let initialized = false;

// Cached state - use ONE persistent session
let cachedRenderer: TypstRenderer | null = null;
let cachedSession: RenderSession | null = null;
let cachedPageInfo: { count: number; heights: number[]; widths: number[] } | null = null;

// Compilation version - increments on each compile to invalidate render cache
let compileVersion = 0;

// Renderer lifecycle tracking
let rendererCompileCount = 0;
const MAX_COMPILES_BEFORE_RENDERER_RESET = 10;

// ─── LRU Cache for rendered pages ───────────────────────────────────────────
const MAX_CACHE_SIZE = 5; // Keep ~5 pages in cache (reduced from 15 to save memory)
const pageCache = new Map<string, { bitmap: ImageBitmap; version: number }>();

function getCacheKey(pageOffset: number, pixelPerPt: number): string {
    return `${pageOffset}-${pixelPerPt.toFixed(2)}`;
}

function getCachedPage(pageOffset: number, pixelPerPt: number): ImageBitmap | null {
    const key = getCacheKey(pageOffset, pixelPerPt);
    const cached = pageCache.get(key);
    if (cached && cached.version === compileVersion) {
        // Move to end (most recently used)
        pageCache.delete(key);
        pageCache.set(key, cached);
        return cached.bitmap;
    }
    // Invalidate stale cache entry
    if (cached) {
        cached.bitmap.close();
        pageCache.delete(key);
    }
    return null;
}

function setCachedPage(pageOffset: number, pixelPerPt: number, bitmap: ImageBitmap): void {
    const key = getCacheKey(pageOffset, pixelPerPt);
    
    // Evict oldest entries if cache is full
    while (pageCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = pageCache.keys().next().value;
        if (oldestKey) {
            const old = pageCache.get(oldestKey);
            old?.bitmap.close();
            pageCache.delete(oldestKey);
        }
    }
    
    pageCache.set(key, { bitmap, version: compileVersion });
}

function clearPageCache(): void {
    log.log(`[typst-worker] Clearing page cache (${pageCache.size} entries)`);
    let closedCount = 0;
    for (const [key, entry] of pageCache.entries()) {
        try {
            entry.bitmap.close();
            closedCount++;
        } catch (e) {
            log.warn(`[typst-worker] Failed to close bitmap for ${key}:`, e);
        }
    }
    pageCache.clear();
    log.log(`[typst-worker] Page cache cleared (${closedCount} bitmaps closed)`);
}

/**
 * Dispose the current render session and release WASM memory.
 * Must be called before creating a new session or on errors.
 */
function disposeSession(): void {
    if (cachedSession) {
        try {
            // Access the raw WASM RenderSession via kObject symbol and call free()
            const sessionWithKObject = cachedSession as RenderSessionWithKObject;
            
            // Runtime check: verify kObject symbol exists on the object
            if (!(kObject in sessionWithKObject)) {
                log.warn('[typst-worker] kObject symbol not found on session, skipping WASM free');
            } else {
                const rawSession = sessionWithKObject[kObject];
                if (rawSession && typeof rawSession.free === 'function') {
                    rawSession.free();
                    log.log('[typst-worker] Session WASM memory freed');
                } else {
                    log.warn('[typst-worker] Session kObject exists but free() method not found');
                }
            }
        } catch (e) {
            log.warn('[typst-worker] Failed to free session:', e);
        }
        cachedSession = null;
    }
    cachedPageInfo = null;
    
    // Dispose renderer after N compilations to free WASM memory
    rendererCompileCount++;
    if (rendererCompileCount >= MAX_COMPILES_BEFORE_RENDERER_RESET) {
        if (cachedRenderer) {
            try {
                const rendererWithKObject = cachedRenderer as TypstRendererWithKObject;
                
                // Runtime check: verify kObject symbol exists on the object
                if (!(kObject in rendererWithKObject)) {
                    log.warn('[typst-worker] kObject symbol not found on renderer, skipping WASM free');
                } else {
                    const rawRenderer = rendererWithKObject[kObject];
                    if (rawRenderer && typeof rawRenderer.free === 'function') {
                        rawRenderer.free();
                        log.log(`[typst-worker] Renderer WASM memory freed after ${rendererCompileCount} compilations`);
                    } else {
                        log.warn('[typst-worker] Renderer kObject exists but free() method not found');
                    }
                }
            } catch (e) {
                log.warn('[typst-worker] Failed to free renderer:', e);
            }
            cachedRenderer = null;
            rendererCompileCount = 0;
        }
    }
}

// ─── OffscreenCanvas Pool ───────────────────────────────────────────────────
const canvasPool = new Map<string, OffscreenCanvas[]>();
const MAX_POOL_SIZE = 1; // Max canvases per size (reduced from 3 to save memory)

function getCanvasSizeKey(width: number, height: number): string {
    return `${width}x${height}`;
}

function acquireCanvas(width: number, height: number): OffscreenCanvas {
    const key = getCanvasSizeKey(width, height);
    const pool = canvasPool.get(key);
    if (pool && pool.length > 0) {
        return pool.pop()!;
    }
    return new OffscreenCanvas(width, height);
}

function releaseCanvas(canvas: OffscreenCanvas): void {
    const key = getCanvasSizeKey(canvas.width, canvas.height);
    let pool = canvasPool.get(key);
    if (!pool) {
        pool = [];
        canvasPool.set(key, pool);
    }
    if (pool.length < MAX_POOL_SIZE) {
        // Clear the canvas before returning to pool
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        pool.push(canvas);
    }
    // If pool is full, canvas is garbage collected
}

function clearCanvasPool(): void {
    log.log(`[typst-worker] Clearing canvas pool (${canvasPool.size} size groups)`);
    for (const [key, pool] of canvasPool.entries()) {
        for (const canvas of pool) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
    canvasPool.clear();
    log.log('[typst-worker] Canvas pool cleared');
}

// ─── Compilation Queue (sequential for compile, parallel for render) ────────
let isCompiling = false;
let pendingCompile: (() => Promise<void>) | null = null;

const CACHE_NAME = 'typst-font-cache-v1';

const browserCachingFetcher = async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

    const isFont = /\.(ttf|otf|woff2|ttc)$/i.test(url) || url.includes('fonts.gstatic.com');

    if (!isFont) {
        return fetch(input, init);
    }

    url = new URL(url, self.location.origin).toString();

    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
        return cachedResponse;
    }

    const response = await fetch(url, init);
    if (response.ok) {
        await cache.put(url, response.clone());
    }

    return response;
};

self.onmessage = async (event: MessageEvent) => {
    const msg = event.data as
        | { type: 'init'; compilerUrl: string; rendererUrl: string }
        | { type: 'compile'; id: number; source: string }
        | { type: 'compile-vector'; id: number; source: string }
        | { type: 'render-page'; id: number; pageOffset: number; pixelPerPt: number };

    if (msg.type === 'init') {
        log.debug('[typst-worker] Received init message...');
        const wasmStart = performance.now();
        try {
            $typst.setCompilerInitOptions({
                getModule: () => msg.compilerUrl,
                beforeBuild: [
                    preloadFontAssets({
                        fetcher: browserCachingFetcher as unknown as typeof fetch,
                        assets: ['text'],
                        assetUrlPrefix: '/fonts/typst/'
                    }),
                ],
            });
            $typst.setRendererInitOptions({ getModule: () => msg.rendererUrl });

            // Warm-up
            await $typst.svg({ mainContent: '= Init' });
            log.info(`[typst-worker] WASM ready in ${(performance.now() - wasmStart).toFixed(0)}ms`);
            initialized = true;
            self.postMessage({ type: 'ready' });
        } catch (err) {
            log.error('[typst-worker] WASM init failed:', err);
            self.postMessage({
                type: 'init-error',
                message: err instanceof Error ? err.message : String(err),
            });
        }
        return;
    }

    if (msg.type === 'compile') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready', diagnostics: [{ severity: 'error', message: 'Compiler not ready', hints: [] }] });
            return;
        }
        try {
            const svg = await $typst.svg({ mainContent: msg.source });
            self.postMessage({ type: 'result', id: msg.id, svg });
        } catch (err) {
            const diagnostics = errorToDiagnostics(err);
            self.postMessage({
                type: 'compile-error',
                id: msg.id,
                message: err instanceof Error ? err.message : String(err),
                diagnostics,
            });
        }
        return;
    }

    if (msg.type === 'compile-vector') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready', diagnostics: [{ severity: 'error', message: 'Compiler not ready', hints: [] }] });
            return;
        }

        // Queue compilation (only one at a time)
        const doCompile = async () => {
            isCompiling = true;
            const compileStart = performance.now();
            try {
                // Dispose old session and clear cache BEFORE starting new compile
                disposeSession();
                clearPageCache();
                clearCanvasPool();
                compileVersion++;
                
                // Compile to vector
                const vectorData = await $typst.vector({ mainContent: msg.source });
                if (!vectorData) {
                    throw new Error('Vector compilation returned undefined');
                }
                log.log(`[typst-worker] vector() done: ${vectorData.byteLength} bytes in ${(performance.now() - compileStart).toFixed(0)}ms`);

                // Get renderer (lazy init)
                if (!cachedRenderer) {
                    cachedRenderer = await $typst.getRenderer();
                }

                // Create a NEW persistent session (replaces old one)
                cachedSession = await (cachedRenderer as any).createModule(vectorData);

                // Extract page info from the persistent session
                const pages: PageInfoItem[] = cachedSession!.retrievePagesInfo();
                cachedPageInfo = {
                    count: pages.length,
                    heights: pages.map(p => p.height),
                    widths: pages.map(p => p.width),
                };

                log.log(`[typst-worker] compile-vector complete: ${cachedPageInfo.count} pages`);
                self.postMessage({
                    type: 'vector-result',
                    id: msg.id,
                    pageCount: cachedPageInfo.count,
                    pageHeights: cachedPageInfo.heights,
                    pageWidths: cachedPageInfo.widths,
                });
            } catch (err) {
                log.debug(`[typst-worker] compile-vector: user error:`, err);
                // Clean up on error to free memory
                disposeSession();
                clearPageCache();
                const diagnostics = errorToDiagnostics(err);
                self.postMessage({
                    type: 'compile-error',
                    id: msg.id,
                    message: err instanceof Error ? err.message : String(err),
                    diagnostics,
                });
            } finally {
                isCompiling = false;
                // Process next pending compile if any
                if (pendingCompile) {
                    const next = pendingCompile;
                    pendingCompile = null;
                    next();
                }
            }
        };

        if (isCompiling) {
            // Replace pending compile (only latest matters)
            pendingCompile = doCompile;
        } else {
            doCompile();
        }
        return;
    }

    if (msg.type === 'render-page') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready', diagnostics: [{ severity: 'error', message: 'Compiler not ready', hints: [] }] });
            return;
        }
        if (!cachedSession || !cachedPageInfo) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'No compiled data. Call compile-vector first.', diagnostics: [{ severity: 'error', message: 'No compiled data. Call compile-vector first.', hints: [] }] });
            return;
        }

        const { id, pageOffset, pixelPerPt } = msg;
        
        // Check cache first
        const cachedBitmap = getCachedPage(pageOffset, pixelPerPt);
        if (cachedBitmap) {
            // Create a copy since we can't transfer the cached bitmap
            const canvas = acquireCanvas(cachedBitmap.width, cachedBitmap.height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(cachedBitmap, 0, 0);
                const bitmap = canvas.transferToImageBitmap();
                log.log(`[typst-worker] renderPage ${pageOffset}: CACHE HIT`);
                self.postMessage(
                    { type: 'page-result', id, bitmap, width: cachedBitmap.width, height: cachedBitmap.height },
                    { transfer: [bitmap] }
                );
            }
            releaseCanvas(canvas);
            return;
        }

        // Render in parallel (no queue for render-page)
        const pageWidth = cachedPageInfo.widths[pageOffset];
        const pageHeight = cachedPageInfo.heights[pageOffset];

        if (pageWidth === undefined || pageHeight === undefined) {
            self.postMessage({ type: 'compile-error', id, message: `Invalid page offset: ${pageOffset}`, diagnostics: [{ severity: 'error', message: `Invalid page offset: ${pageOffset}`, hints: [] }] });
            return;
        }

        const canvasWidth = Math.ceil(pageWidth * pixelPerPt);
        const canvasHeight = Math.ceil(pageHeight * pixelPerPt);
        const currentVersion = compileVersion;

        const renderStart = performance.now();
        try {
            const offscreen = acquireCanvas(canvasWidth, canvasHeight);
            const ctx = offscreen.getContext('2d');

            if (!ctx) {
                throw new Error('Failed to get 2d context');
            }

            // Render using the PERSISTENT session
            await cachedSession.renderCanvas({
                canvas: ctx as unknown as CanvasRenderingContext2D,
                pageOffset,
                pixelPerPt,
                backgroundColor: '#ffffff',
            });

            // Check if compilation changed during render
            if (currentVersion !== compileVersion) {
                log.log(`[typst-worker] renderPage ${pageOffset}: discarded (stale version)`);
                releaseCanvas(offscreen);
                return;
            }

            // Create bitmap for transfer and cache
            const bitmap = offscreen.transferToImageBitmap();
            
            // Cache a copy of the bitmap
            const cacheCanvas = acquireCanvas(canvasWidth, canvasHeight);
            const cacheCtx = cacheCanvas.getContext('2d');
            if (cacheCtx) {
                cacheCtx.drawImage(bitmap, 0, 0);
                const cacheBitmap = cacheCanvas.transferToImageBitmap();
                setCachedPage(pageOffset, pixelPerPt, cacheBitmap);
            }
            releaseCanvas(cacheCanvas);
            releaseCanvas(offscreen);

            log.log(`[typst-worker] renderPage ${pageOffset}: ${canvasWidth}x${canvasHeight} in ${(performance.now() - renderStart).toFixed(0)}ms`);

            self.postMessage(
                { type: 'page-result', id, bitmap, width: canvasWidth, height: canvasHeight },
                { transfer: [bitmap] }
            );
        } catch (err) {
            log.warn(`[typst-worker] render-page ERROR:`, err);
            const diagnostics = errorToDiagnostics(err);
            self.postMessage({
                type: 'compile-error',
                id,
                message: err instanceof Error ? err.message : String(err),
                diagnostics,
            });
        }
    }
};
