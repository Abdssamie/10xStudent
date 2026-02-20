'use client';

import { useEffect, useState, useRef } from 'react';
import { getCachedWasm } from '@/lib/typst-cache';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkerInMessage =
  | { type: 'init'; compilerUrl: string; rendererUrl: string }
  | { type: 'compile'; id: number; source: string };

type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | { type: 'result'; id: number; svg: string }
  | { type: 'compile-error'; id: number; message: string };

export interface TypstCompiler {
  /** Compile Typst source to SVG. Returns the SVG string or throws on error. */
  compile(source: string): Promise<string>;
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
let nextCompileId = 0;

function getOrCreateWorker(): Worker {
  if (workerSingleton) return workerSingleton;

  // Next.js/Turbopack recognises `new URL(…, import.meta.url)` statically and
  // bundles the worker file, making imports inside it work correctly.
  workerSingleton = new Worker(
    new URL('../lib/typst-worker.ts', import.meta.url),
    { type: 'module' },
  );

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
      const pending = pendingCompiles.get(msg.id);
      if (pending) {
        pendingCompiles.delete(msg.id);
        pending.reject(new Error(msg.message));
      }
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

async function initWorker(): Promise<void> {
  if (workerReady) return;
  if (workerError) throw new Error(workerError);
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = new Promise<void>((resolve, reject) => {
    const worker = getOrCreateWorker();

    readyCallbacks.push(resolve);
    errorCallbacks.push((msg) => reject(new Error(msg)));

    // Fetch and cache both WASM files, then tell the worker where to load from.
    Promise.all([
      getCachedWasm('compiler', '0.7.0-rc2', '/wasm/typst_ts_web_compiler_bg.wasm'),
      getCachedWasm('renderer', '0.7.0-rc2', '/wasm/typst_ts_renderer_bg.wasm'),
    ]).then(([compilerUrl, rendererUrl]) => {
      const msg: WorkerInMessage = { type: 'init', compilerUrl, rendererUrl };
      worker.postMessage(msg);
    }).catch((err: unknown) => {
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
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTypst(): TypstState {
  const [state, setState] = useState<TypstState>({
    isLoading: !workerReady,
    isReady: workerReady,
    error: workerError,
    compiler: workerReady ? compiler : null,
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
