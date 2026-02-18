/**
 * Storage service factory
 * Creates and configures storage service instances
 */

import { R2StorageService } from "./r2-storage-service";
import type { StorageService } from "./interface";

/**
 * Create a configured storage service instance
 * Currently returns R2StorageService, but can be extended to support other storage backends
 */
export function createStorageService(): StorageService {
  return new R2StorageService();
}
