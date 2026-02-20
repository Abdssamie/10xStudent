/**
 * Typst Compilation Web Worker (bundled by Next.js/Turbopack)
 *
 * This worker owns the $typst instance so all WASM execution is off the main thread.
 *
 * Message protocol:
 *
 * Main → Worker:
 *   { type: 'init'; compilerUrl: string; rendererUrl: string }
 *   { type: 'compile'; id: number; source: string }
 *
 * Worker → Main:
 *   { type: 'ready' }
 *   { type: 'init-error'; message: string }
 *   { type: 'result'; id: number; svg: string }
 *   { type: 'compile-error'; id: number; message: string }
 */

import { $typst } from '@myriaddreamin/typst.ts';

let initialized = false;

self.onmessage = async (event: MessageEvent) => {
    const msg = event.data as
        | { type: 'init'; compilerUrl: string; rendererUrl: string }
        | { type: 'compile'; id: number; source: string };

    if (msg.type === 'init') {
        try {
            $typst.setCompilerInitOptions({ getModule: () => msg.compilerUrl });
            $typst.setRendererInitOptions({ getModule: () => msg.rendererUrl });
            // Warm-up: forces WASM instantiation upfront so first compile is fast.
            await $typst.svg({ mainContent: '= Init' });
            initialized = true;
            self.postMessage({ type: 'ready' });
        } catch (err) {
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
    }
};
