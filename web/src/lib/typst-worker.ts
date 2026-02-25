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
 *   { type: 'compile-error'; id: number; message: string }
 *   { type: 'vector-result'; id: number; pageCount: number; pageHeights: number[]; pageWidths: number[] }
 *   { type: 'page-result'; id: number; imageData: ImageData; width: number; height: number }
 */

import { $typst } from '@myriaddreamin/typst.ts';
import { preloadFontAssets } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';
import type { TypstRenderer, RenderSession } from '@myriaddreamin/typst.ts/dist/esm/renderer.mjs';

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

// Simple sequential processing - no concurrency allowed
let isBusy = false;
const pendingWork: Array<() => Promise<void>> = [];

async function enqueue(work: () => Promise<void>) {
    pendingWork.push(work);
    if (!isBusy) {
        isBusy = true;
        while (pendingWork.length > 0) {
            const job = pendingWork.shift()!;
            await job();
        }
        isBusy = false;
    }
}

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
        console.debug('[typst-worker] Received init message...');
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
            console.info(`[typst-worker] WASM ready in ${(performance.now() - wasmStart).toFixed(0)}ms`);
            initialized = true;
            self.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('[typst-worker] WASM init failed:', err);
            self.postMessage({
                type: 'init-error',
                message: err instanceof Error ? err.message : String(err),
            });
        }
        return;
    }

    if (msg.type === 'compile') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready' });
            return;
        }
        try {
            const svg = await $typst.svg({ mainContent: msg.source });
            self.postMessage({ type: 'result', id: msg.id, svg });
        } catch (err) {
            self.postMessage({
                type: 'compile-error',
                id: msg.id,
                message: err instanceof Error ? err.message : String(err),
            });
        }
        return;
    }

    if (msg.type === 'compile-vector') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready' });
            return;
        }

        // Clear any pending renders - they're for old data
        pendingWork.length = 0;

        await enqueue(async () => {
            const compileStart = performance.now();
            try {
                // Compile to vector
                const vectorData = await $typst.vector({ mainContent: msg.source });
                if (!vectorData) {
                    throw new Error('Vector compilation returned undefined');
                }
                console.log(`[typst-worker] vector() done: ${vectorData.byteLength} bytes in ${(performance.now() - compileStart).toFixed(0)}ms`);

                // Get renderer (lazy init)
                if (!cachedRenderer) {
                    cachedRenderer = await $typst.getRenderer();
                }

                // Create a NEW persistent session (replaces old one)
                // Note: createModule exists on TypstRendererDriver but not in interface
                cachedSession = await (cachedRenderer as any).createModule(vectorData);

                // Extract page info from the persistent session
                const pages: PageInfoItem[] = cachedSession!.retrievePagesInfo();
                cachedPageInfo = {
                    count: pages.length,
                    heights: pages.map(p => p.height),
                    widths: pages.map(p => p.width),
                };

                console.log(`[typst-worker] compile-vector complete: ${cachedPageInfo.count} pages`);
                self.postMessage({
                    type: 'vector-result',
                    id: msg.id,
                    pageCount: cachedPageInfo.count,
                    pageHeights: cachedPageInfo.heights,
                    pageWidths: cachedPageInfo.widths,
                });
            } catch (err) {
                console.error(`[typst-worker] compile-vector ERROR:`, err);
                self.postMessage({
                    type: 'compile-error',
                    id: msg.id,
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        });
        return;
    }

    if (msg.type === 'render-page') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready' });
            return;
        }
        if (!cachedSession || !cachedPageInfo) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'No compiled data. Call compile-vector first.' });
            return;
        }

        const { id, pageOffset, pixelPerPt } = msg;

        await enqueue(async () => {
            if (!cachedSession || !cachedPageInfo) return;

            const pageWidth = cachedPageInfo.widths[pageOffset];
            const pageHeight = cachedPageInfo.heights[pageOffset];

            if (pageWidth === undefined || pageHeight === undefined) {
                self.postMessage({ type: 'compile-error', id, message: `Invalid page offset: ${pageOffset}` });
                return;
            }

            const canvasWidth = Math.ceil(pageWidth * pixelPerPt);
            const canvasHeight = Math.ceil(pageHeight * pixelPerPt);

            const renderStart = performance.now();
            try {
                const offscreen = new OffscreenCanvas(canvasWidth, canvasHeight);
                const ctx = offscreen.getContext('2d');

                if (!ctx) {
                    throw new Error('Failed to get 2d context');
                }

                // Render using the PERSISTENT session - no create/destroy
                await cachedSession.renderCanvas({
                    canvas: ctx as unknown as CanvasRenderingContext2D,
                    pageOffset,
                    pixelPerPt,
                    backgroundColor: '#ffffff',
                });

                const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

                console.log(`[typst-worker] renderPage ${pageOffset}: ${canvasWidth}x${canvasHeight} in ${(performance.now() - renderStart).toFixed(0)}ms`);

                self.postMessage(
                    { type: 'page-result', id, imageData, width: canvasWidth, height: canvasHeight },
                    { transfer: [imageData.data.buffer as ArrayBuffer] }
                );
            } catch (err) {
                console.error(`[typst-worker] render-page ERROR:`, err);
                self.postMessage({
                    type: 'compile-error',
                    id,
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        });
    }
};
