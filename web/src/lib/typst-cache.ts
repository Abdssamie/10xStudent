const CACHE_NAME = 'typst-wasm-v1';
const WASM_VERSION = '0.7.0-rc2';

// Track blob URLs for cleanup
const activeBlobUrls = new Set<string>();

// Versioned key busts the cache entry when WASM_VERSION changes.
function cacheKey(url: string, version: string) {
  return `${url}?v=${version}`;
}

export async function getCachedWasm(
  type: 'compiler' | 'renderer',
  version: string,
  url: string,
): Promise<string> {
  const tag = `[typst-cache:${type}]`;

  if (typeof caches === 'undefined') {
    console.warn(`${tag} Cache API unavailable - fetching fresh from ${url}`);
    return url;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const key = cacheKey(url, version);
    console.log(`${tag} Looking up cache entry for key: "${key}"`);

    const cached = await cache.match(key);

    if (cached) {
      const blob = await cached.blob();
      console.log(`${tag} CACHE HIT - serving ${type} WASM from Cache API (${(blob.size / 1024).toFixed(1)} KB). No network request.`);
      // Set correct MIME type so the worker can use WebAssembly.instantiateStreaming.
      const wasmBlob = new Blob([blob], { type: 'application/wasm' });
      const blobUrl = URL.createObjectURL(wasmBlob);
      activeBlobUrls.add(blobUrl);
      return blobUrl;
    }

    console.log(`${tag} CACHE MISS - fetching fresh ${type} WASM from "${url}". Will be cached for next load.`);
    const fetchStart = performance.now();
    const response = await fetch(url);
    const fetchMs = (performance.now() - fetchStart).toFixed(0);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} WASM: ${response.statusText}`);
    }

    const bytes = await response.arrayBuffer();
    console.log(`${tag} Fetched in ${fetchMs} ms (${(bytes.byteLength / 1024).toFixed(1)} KB). Storing in cache.`);

    await cache.put(key, new Response(bytes.slice(0), {
      headers: { 'Content-Type': 'application/wasm' },
    }));
    console.log(`${tag} Stored in cache. Next load will be a cache hit.`);

    const wasmBlob = new Blob([bytes], { type: 'application/wasm' });
    const blobUrl = URL.createObjectURL(wasmBlob);
    activeBlobUrls.add(blobUrl);
    return blobUrl;

  } catch (error) {
    console.error(`${tag} Cache strategy failed - falling back to direct URL "${url}":`, error);
    return url;
  }
}

export async function clearWasmCache(): Promise<void> {
  console.log('[typst-cache] Clearing WASM cache:', CACHE_NAME);
  await caches.delete(CACHE_NAME);
  console.log('[typst-cache] Cache cleared.');
}

/**
 * Revokes all active blob URLs created by getCachedWasm.
 * Call this when terminating the worker to prevent memory leaks.
 */
export function revokeWasmBlobUrls(): void {
  console.log(`[typst-cache] Revoking ${activeBlobUrls.size} blob URLs`);
  for (const url of activeBlobUrls) {
    URL.revokeObjectURL(url);
  }
  activeBlobUrls.clear();
}

export { WASM_VERSION };
