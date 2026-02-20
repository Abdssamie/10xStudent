'use client';

import { useEffect, useState } from 'react';
import { $typst } from '@myriaddreamin/typst.ts';
import { getCachedWasm } from '@/lib/typst-cache';

interface TypstState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

let typstInitialized = false;
let typstInitPromise: Promise<void> | null = null;

async function initializeTypst(): Promise<void> {
  if (typstInitialized) return;
  if (typstInitPromise) return typstInitPromise;

  typstInitPromise = (async () => {
    try {
      const compilerUrl = await getCachedWasm(
        'compiler',
        '0.7.0-rc2',
        '/wasm/typst_ts_web_compiler_bg.wasm'
      );
      const rendererUrl = await getCachedWasm(
        'renderer',
        '0.7.0-rc2',
        '/wasm/typst_ts_renderer_bg.wasm'
      );

      $typst.setCompilerInitOptions({
        getModule: () => compilerUrl,
      });
      $typst.setRendererInitOptions({
        getModule: () => rendererUrl,
      });

      await $typst.svg({ mainContent: '= Init' });
      typstInitialized = true;
    } catch (error) {
      typstInitPromise = null;
      throw error;
    }
  })();

  return typstInitPromise;
}

export function useTypst(): TypstState {
  const [state, setState] = useState<TypstState>({
    isLoading: !typstInitialized,
    isReady: typstInitialized,
    error: null,
  });

  useEffect(() => {
    if (typstInitialized) {
      setState({ isLoading: false, isReady: true, error: null });
      return;
    }

    initializeTypst()
      .then(() => {
        setState({ isLoading: false, isReady: true, error: null });
      })
      .catch((error) => {
        setState({
          isLoading: false,
          isReady: false,
          error: error instanceof Error ? error.message : 'Failed to initialize Typst',
        });
      });
  }, []);

  return state;
}
