/**
 * Service container factory
 * Manages service dependencies and enables easier testing
 */

import { DB } from "@/database";
import { CreditManager } from "./credit-manager";
import { AgentService } from "./agent";
import { createStorageService } from "./storage/factory";
import type { StorageService } from "./storage/interface";

/**
 * Service container interface
 * Contains all application services with their dependencies properly injected
 */
export interface ServiceContainer {
  db: DB;
  creditManager: CreditManager;
  agentService: AgentService;
  storageService: StorageService;
}

/**
 * Create a service container with all dependencies properly wired
 * 
 * @param db - Database instance to inject into services
 * @returns ServiceContainer with all services initialized
 */
export function createServiceContainer(db: DB): ServiceContainer {
  // Initialize services with dependencies
  const creditManager = new CreditManager(db);
  const agentService = new AgentService(db, creditManager);
  const storageService = createStorageService();

  return {
    db,
    creditManager,
    agentService,
    storageService,
  };
}
