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
 *
 * Worker -> Main:
 *   { type: 'ready' }
 *   { type: 'init-error'; message: string }
 *   { type: 'result'; id: number; svg: string }
 *   { type: 'compile-error'; id: number; message: string }
 */

import { $typst } from '@myriaddreamin/typst.ts';
import { preloadFontAssets } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';

let initialized = false;

const CACHE_NAME = 'typst-font-cache-v1';

const browserCachingFetcher = async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

    // 1. Check if this is a font. If NOT, just return a normal fetch.
    const isFont = /\.(ttf|otf|woff2|ttc)$/i.test(url) || url.includes('fonts.gstatic.com');

    if (!isFont) {
        // Let Typst packages and other assets bypass the cache logic
        return fetch(input, init);
    }

    // Rewrite font URLs to use our local public folder avoiding external requests
    // Typst.ts by default fetches from unpkg.com/@myriaddreamin/...
    if (url.includes('@myriaddreamin/typst.ts') || url.includes('unpkg.com')) {
        const filename = url.split('/').pop();
        if (filename) {
            url = `/fonts/typst/${filename}`;
        }
    }

    // 2. Open the browser's Cache Storage
    const cache = await caches.open(CACHE_NAME);

    // 3. Check if we already have this font cached
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
        return cachedResponse;
    }

    // 4. Cache Miss: Fetch from your public folder or remote URL
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
        | { type: 'compile'; id: number; source: string };

    if (msg.type === 'init') {
        console.debug('[typst-worker:inner] Received init message. Starting WASM instantiation...');
        const wasmStart = performance.now();
        try {
            $typst.setCompilerInitOptions({
                getModule: () => msg.compilerUrl,
                beforeBuild: [
                    // Fetch standard Typst text fonts (LibertinusSerif, NewCM, DejaVu)
                    preloadFontAssets({
                        fetcher: browserCachingFetcher as unknown as typeof fetch,
                        assets: ['text'],
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
};
