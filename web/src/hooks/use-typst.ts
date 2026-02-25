'use client';

import { useEffect, useState, useRef } from 'react';
import { getCachedWasm, revokeWasmBlobUrls } from '@/lib/typst-cache';

// Conditional logging - only log in development
const DEBUG = process.env.NODE_ENV !== 'production';
const log = {
  debug: DEBUG ? console.debug.bind(console) : () => {},
  info: DEBUG ? console.info.bind(console) : () => {},
  log: DEBUG ? console.log.bind(console) : () => {},
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

export interface PageInfo {
  count: number;
  heights: number[];
  widths: number[];
}

/** Result of rendering a single page */
export interface PageRenderResult {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

type WorkerInMessage =
  | { type: 'init'; compilerUrl: string; rendererUrl: string }
  | { type: 'compile'; id: number; source: string }
  | { type: 'compile-vector'; id: number; source: string }
  | { type: 'render-page'; id: number; pageOffset: number; pixelPerPt: number };

type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | { type: 'result'; id: number; svg: string }
  | { type: 'compile-error'; id: number; message: string }
  | { type: 'vector-result'; id: number; pageCount: number; pageHeights: number[]; pageWidths: number[] }
  | { type: 'page-result'; id: number; bitmap: ImageBitmap; width: number; height: number };

export interface TypstCompiler {
  /** Compile Typst source to SVG. Returns the SVG string or throws on error. */
  compile(source: string): Promise<string>;
  /** Compile to vector format for viewport rendering. Returns page info. */
  compileVector(source: string): Promise<PageInfo>;
  /** Render a single page from cached vector data. */
  renderPage(pageOffset: number, pixelPerPt: number): Promise<PageRenderResult>;
}

interface TypstState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  compiler: TypstCompiler | null;
}

// ─── Module-level singleton ────────────────────────────────────────────────────
// We keep a single worker alive for the lifetime of the page so it is shared
// across all editor instances and the WASM is only loaded once.

let workerSingleton: Worker | null = null;
let workerReady = false;
let workerError: string | null = null;
let workerInitPromise: Promise<void> | null = null;

// Pending compile calls waiting for a result keyed by request id.
const pendingCompiles = new Map<number, { resolve: (svg: string) => void; reject: (err: Error) => void }>();
const pendingVectors = new Map<number, { resolve: (info: PageInfo) => void; reject: (err: Error) => void }>();
const pendingPages = new Map<number, { resolve: (result: PageRenderResult) => void; reject: (err: Error) => void }>();
let nextCompileId = 0;

function getOrCreateWorker(): Worker {
  if (workerSingleton) {
    log.debug('[typst-worker] Reusing existing worker singleton - no new Worker created.');
    return workerSingleton;
  }

  log.info('[typst-worker] Creating new Worker (first load or page refresh).');
  workerSingleton = new Worker(
    new URL('../lib/typst-worker.ts', import.meta.url),
    { type: 'module' },
  );

  // Clean up on page unload to prevent memory leaks
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', terminateWorker);
  }

  workerSingleton.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
    const msg = event.data;

    if (msg.type === 'ready') {
      workerReady = true;
      readyCallbacks.forEach(cb => cb());
      readyCallbacks = [];
      return;
    }

    if (msg.type === 'init-error') {
      workerError = msg.message;
      errorCallbacks.forEach(cb => cb(msg.message));
      errorCallbacks = [];
      return;
    }

    if (msg.type === 'result') {
      const pending = pendingCompiles.get(msg.id);
      if (pending) {
        pendingCompiles.delete(msg.id);
        pending.resolve(msg.svg);
      }
      return;
    }

    if (msg.type === 'compile-error') {
      const pendingCompile = pendingCompiles.get(msg.id);
      if (pendingCompile) {
        pendingCompiles.delete(msg.id);
        pendingCompile.reject(new Error(msg.message));
      }
      const pendingVector = pendingVectors.get(msg.id);
      if (pendingVector) {
        pendingVectors.delete(msg.id);
        pendingVector.reject(new Error(msg.message));
      }
      const pendingPage = pendingPages.get(msg.id);
      if (pendingPage) {
        pendingPages.delete(msg.id);
        pendingPage.reject(new Error(msg.message));
      }
      return;
    }

    if (msg.type === 'vector-result') {
      const pending = pendingVectors.get(msg.id);
      if (pending) {
        pendingVectors.delete(msg.id);
        pending.resolve({ count: msg.pageCount, heights: msg.pageHeights, widths: msg.pageWidths });
      }
      return;
    }

    if (msg.type === 'page-result') {
      const pending = pendingPages.get(msg.id);
      if (pending) {
        pendingPages.delete(msg.id);
        pending.resolve({ bitmap: msg.bitmap, width: msg.width, height: msg.height });
      }
      return;
    }
  };

  workerSingleton.onerror = (e) => {
    workerError = e.message;
    errorCallbacks.forEach(cb => cb(e.message));
    errorCallbacks = [];
  };

  return workerSingleton;
}

let readyCallbacks: Array<() => void> = [];
let errorCallbacks: Array<(msg: string) => void> = [];

/**
 * Terminates the worker and cleans up resources.
 * Called on page unload to prevent memory leaks.
 */
function terminateWorker(): void {
  if (workerSingleton) {
    log.log('[typst-worker] Terminating worker and cleaning up resources');
    workerSingleton.terminate();
    workerSingleton = null;
    workerReady = false;
    workerError = null;
    workerInitPromise = null;
    revokeWasmBlobUrls();
    pendingCompiles.clear();
    pendingVectors.clear();
    pendingPages.clear();
  }
}

async function initWorker(): Promise<void> {
  if (workerReady) {
    log.debug('[typst-worker] initWorker() short-circuited: worker already ready.');
    return;
  }
  if (workerError) {
    log.warn('[typst-worker] initWorker() short-circuited: worker previously errored:', workerError);
    throw new Error(workerError);
  }
  if (workerInitPromise) {
    log.debug('[typst-worker] initWorker() short-circuited: init already in-flight, awaiting existing promise.');
    return workerInitPromise;
  }

  log.info('[typst-worker] Starting worker init sequence – fetching WASM bundles...');
  const initStart = performance.now();

  workerInitPromise = new Promise<void>((resolve, reject) => {
    const worker = getOrCreateWorker();

    readyCallbacks.push(() => {
      log.info(`[typst-worker] Worker ready in ${(performance.now() - initStart).toFixed(0)} ms.`);
      resolve();
    });
    errorCallbacks.push((msg) => {
      log.error('[typst-worker] Worker init failed:', msg);
      reject(new Error(msg));
    });

    // Fetch and cache WASM bytes (Cache API), then pass blob URLs to the worker.
    log.log('[typst-worker] Resolving WASM URLs via cache...');
    Promise.all([
      getCachedWasm('compiler', '0.7.0-rc2', '/wasm/typst_ts_web_compiler_bg.wasm'),
      getCachedWasm('renderer', '0.7.0-rc2', '/wasm/typst_ts_renderer_bg.wasm'),
    ]).then(([compilerUrl, rendererUrl]) => {
      log.log('[typst-worker] WASM URLs resolved - posting init message to worker.');
      const msg: WorkerInMessage = { type: 'init', compilerUrl, rendererUrl };
      worker.postMessage(msg);
    }).catch((err: unknown) => {
      log.error('[typst-worker] Failed to resolve WASM URLs:', err);
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });

  return workerInitPromise;
}

const compiler: TypstCompiler = {
  compile(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!workerSingleton || !workerReady) {
        reject(new Error('Typst compiler is not ready'));
        return;
      }
      const id = nextCompileId++;
      pendingCompiles.set(id, { resolve, reject });
      const msg: WorkerInMessage = { type: 'compile', id, source };
      workerSingleton.postMessage(msg);
    });
  },
  compileVector(source: string): Promise<PageInfo> {
    return new Promise((resolve, reject) => {
      if (!workerSingleton || !workerReady) {
        reject(new Error('Typst compiler is not ready'));
        return;
      }
      const id = nextCompileId++;
      pendingVectors.set(id, { resolve, reject });
      const msg: WorkerInMessage = { type: 'compile-vector', id, source };
      workerSingleton.postMessage(msg);
    });
  },
  renderPage(pageOffset: number, pixelPerPt: number): Promise<PageRenderResult> {
    return new Promise((resolve, reject) => {
      if (!workerSingleton || !workerReady) {
        reject(new Error('Typst compiler is not ready'));
        return;
      }
      const id = nextCompileId++;
      pendingPages.set(id, { resolve, reject });
      const msg: WorkerInMessage = { type: 'render-page', id, pageOffset, pixelPerPt };
      workerSingleton.postMessage(msg);
    });
  },
};


export function useTypst(): TypstState {
  const [state, setState] = useState<TypstState>(() => {
    if (workerReady) {
      log.debug('[use-typst] Hook mounted – worker already ready, no loading state needed.');
    } else {
      log.debug('[use-typst] Hook mounted – worker not yet ready, entering loading state.');
    }
    return {
      isLoading: !workerReady,
      isReady: workerReady,
      error: workerError,
      compiler: workerReady ? compiler : null,
    };
  });

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (workerReady) {
      setState({ isLoading: false, isReady: true, error: null, compiler });
      return;
    }

    initWorker()
      .then(() => {
        if (mounted.current) {
          setState({ isLoading: false, isReady: true, error: null, compiler });
        }
      })
      .catch((err: unknown) => {
        if (mounted.current) {
          setState({
            isLoading: false,
            isReady: false,
            error: err instanceof Error ? err.message : 'Failed to initialize Typst',
            compiler: null,
          });
        }
      });
  }, []);

  return state;
}
