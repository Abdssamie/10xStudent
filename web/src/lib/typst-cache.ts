const CACHE_NAME = 'typst-wasm-v1';
const WASM_VERSION = '0.7.0-rc2';

interface CacheEntry {
  version: string;
  data: ArrayBuffer;
  timestamp: number;
}

async function getCachedWasm(
  type: 'compiler' | 'renderer',
  version: string,
  fallbackUrl: string
): Promise<string> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(fallbackUrl);

    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }

    const response = await fetch(fallbackUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} WASM: ${response.statusText}`);
    }

    await cache.put(fallbackUrl, response.clone());
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Failed to cache ${type} WASM:`, error);
    return fallbackUrl;
  }
}

export async function clearWasmCache(): Promise<void> {
  await caches.delete(CACHE_NAME);
}

export { getCachedWasm, WASM_VERSION };
