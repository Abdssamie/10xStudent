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
import type { TypstRenderer } from '@myriaddreamin/typst.ts/dist/esm/renderer.mjs';

interface PageInfo {
    pageOffset: number;
    width: number;
    height: number;
}

let initialized = false;

// Cached state for viewport rendering
let cachedRenderer: TypstRenderer | null = null;
let cachedVectorData: Uint8Array | null = null;
let cachedPageInfo: { count: number; heights: number[]; widths: number[] } | null = null;

const CACHE_NAME = 'typst-font-cache-v1';

const browserCachingFetcher = async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

    // 1. Check if this is a font. If NOT, just return a normal fetch.
    const isFont = /\.(ttf|otf|woff2|ttc)$/i.test(url) || url.includes('fonts.gstatic.com');

    if (!isFont) {
        console.debug("Faced non font asset: ", url)
        // Let Typst packages and other assets bypass the cache logic
        return fetch(input, init);
    }

    url = new URL(url, self.location.origin).toString();

    console.debug("Faced font asset: ", url)
    // 2. Open the browser's Cache Storage
    const cache = await caches.open(CACHE_NAME);

    // 3. Check if we already have this font cached
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
        console.log("Cache hit for public/fonts")
        return cachedResponse;
    }

    // 4. Cache Miss: Fetch from your public folder or remote URL
    console.log("Cache miss for public/fonts")
    const response = await fetch(url, init);

    // 5. Store a copy in the cache for next time
    if (response.ok) {
        // We put a clone in the cache so the original can be returned to the app
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
        console.debug('[typst-worker:inner] Received init message. Starting WASM instantiation...');
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

            // Warm-up: forces WASM instantiation upfront so first compile is fast.
            await $typst.svg({ mainContent: '= Init' });
            const wasmMs = (performance.now() - wasmStart).toFixed(0);
            console.info(`[typst-worker:inner] WASM instantiated in ${wasmMs} ms. Worker is ready.`);
            initialized = true;
            self.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('[typst-worker:inner] WASM instantiation failed:', err);
            self.postMessage({
                type: 'init-error',
                message: err instanceof Error ? err.message : String(err),
            });
        }
        return;
    }

    if (msg.type === 'compile') {
        if (!initialized) {
            console.warn('[typst-worker:inner] Compile requested but worker not initialized yet (id=' + msg.id + ').');
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready' });
            return;
        }
        const compileStart = performance.now();
        try {
            const svg = await $typst.svg({ mainContent: msg.source });
            const compileMs = (performance.now() - compileStart).toFixed(0);
            console.debug(`[typst-worker:inner] Compiled id=${msg.id} in ${compileMs} ms.`);
            self.postMessage({ type: 'result', id: msg.id, svg });
        } catch (err) {
            console.error(`[typst-worker:inner] Compile error for id=${msg.id}:`, err);
            self.postMessage({
                type: 'compile-error',
                id: msg.id,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    // Compile to vector format for viewport rendering
    if (msg.type === 'compile-vector') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready' });
            return;
        }
        const compileStart = performance.now();
        try {
            // Compile to vector format (this is the expensive step, done once)
            const vectorData = await $typst.vector({ mainContent: msg.source });
            if (!vectorData) {
                throw new Error('Vector compilation returned undefined');
            }
            cachedVectorData = vectorData;
            console.log(`[typst-worker] vector() done: ${vectorData.byteLength} bytes in ${(performance.now() - compileStart).toFixed(0)}ms`);

            // Get renderer (lazy init)
            if (!cachedRenderer) {
                cachedRenderer = await $typst.getRenderer();
            }

            // Extract page info using a temporary session
            const pageInfo = await cachedRenderer.runWithSession(
                { format: 'vector', artifactContent: vectorData },
                async (session) => {
                    const pages: PageInfo[] = session.retrievePagesInfo();
                    return {
                        count: pages.length,
                        heights: pages.map(p => p.height),
                        widths: pages.map(p => p.width),
                    };
                }
            );
            cachedPageInfo = pageInfo;
            
            console.log(`[typst-worker] compile-vector complete: ${pageInfo.count} pages`);
            self.postMessage({
                type: 'vector-result',
                id: msg.id,
                pageCount: pageInfo.count,
                pageHeights: pageInfo.heights,
                pageWidths: pageInfo.widths,
            });
        } catch (err) {
            console.error(`[typst-worker] compile-vector ERROR:`, err);
            self.postMessage({
                type: 'compile-error',
                id: msg.id,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    // Render single page using cached vector data
    if (msg.type === 'render-page') {
        if (!initialized) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'Compiler not ready' });
            return;
        }
        if (!cachedVectorData || !cachedRenderer || !cachedPageInfo) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: 'No cached vector data. Call compile-vector first.' });
            return;
        }
        
        const { pageOffset, pixelPerPt } = msg;
        
        // Get page dimensions from cached info
        const pageWidth = cachedPageInfo.widths[pageOffset];
        const pageHeight = cachedPageInfo.heights[pageOffset];
        
        if (pageWidth === undefined || pageHeight === undefined) {
            self.postMessage({ type: 'compile-error', id: msg.id, message: `Invalid page offset: ${pageOffset}` });
            return;
        }
        
        const canvasWidth = Math.ceil(pageWidth * pixelPerPt);
        const canvasHeight = Math.ceil(pageHeight * pixelPerPt);
        
        const renderStart = performance.now();
        try {
            // Create OffscreenCanvas for this page
            const offscreen = new OffscreenCanvas(canvasWidth, canvasHeight);
            const ctx = offscreen.getContext('2d');
            
            if (!ctx) {
                throw new Error('Failed to get 2d context from OffscreenCanvas');
            }
            
            // Render the specific page to canvas
            await cachedRenderer.runWithSession(
                { format: 'vector', artifactContent: cachedVectorData },
                async (session) => {
                    await session.renderCanvas({
                        // Cast to CanvasRenderingContext2D - OffscreenCanvas context is compatible at runtime
                        canvas: ctx as unknown as CanvasRenderingContext2D,
                        pageOffset,
                        pixelPerPt,
                        backgroundColor: '#ffffff',
                    });
                }
            );
            
            // Extract ImageData and transfer it
            const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            
            console.log(`[typst-worker] renderPage ${pageOffset}: ${canvasWidth}x${canvasHeight} in ${(performance.now() - renderStart).toFixed(0)}ms`);
            
            // Transfer the buffer for zero-copy
            self.postMessage(
                { type: 'page-result', id: msg.id, imageData, width: canvasWidth, height: canvasHeight },
                { transfer: [imageData.data.buffer as ArrayBuffer] }
            );
        } catch (err) {
            console.error(`[typst-worker] render-page ERROR:`, err);
            self.postMessage({
                type: 'compile-error',
                id: msg.id,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
};
