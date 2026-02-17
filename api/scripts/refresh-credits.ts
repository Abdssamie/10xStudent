#!/usr/bin/env bun
/**
 * Monthly Credit Refresh Job
 * 
 * This script refreshes user credits on a monthly basis.
 * Run via cron: 0 0 1 * * (midnight on the 1st of every month)
 * Or manually: bun run scripts/refresh-credits.ts
 */

import { CreditRefreshService } from "../src/services/credit-refresh";
import { db } from "../src/database";

/**
 * Configuration for the refresh job
 */
const CONFIG = {
  /** Maximum users to process in one run */
  BATCH_SIZE: 1000,
  /** Exit codes */
  EXIT_SUCCESS: 0,
  EXIT_ERROR: 1,
} as const;

/**
 * Run the credit refresh job
 */
async function runRefreshJob(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Monthly Credit Refresh Job Started");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  const service = new CreditRefreshService(db);

  try {
    // Get stats before processing
    const statsBefore = await service.getRefreshStats();
    console.log("\n📊 Pre-execution Stats:");
    console.log(`  Total users: ${statsBefore.totalUsers}`);
    console.log(`  Users needing refresh: ${statsBefore.usersNeedingRefresh}`);
    console.log(`  Last refresh: ${statsBefore.lastRefreshDate?.toISOString() ?? "Never"}`);

    if (statsBefore.usersNeedingRefresh === 0) {
      console.log("\n✅ No users need credit refresh. Exiting.");
      process.exit(CONFIG.EXIT_SUCCESS);
    }

    // Process credit refreshes
    console.log(`\n🔄 Processing up to ${CONFIG.BATCH_SIZE} users...`);
    const result = await service.refreshAllCredits(CONFIG.BATCH_SIZE);

    // Report results
    console.log("\n📈 Results:");
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Successful: ${result.successful}`);
    console.log(`  Failed: ${result.failed}`);

    // Show sample of refreshed users
    if (result.results.length > 0) {
      console.log("\n📝 Sample Refreshed Users:");
      result.results.slice(0, 5).forEach((r) => {
        console.log(`  - ${r.userId}: ${r.previousCredits} → ${r.newCredits} credits`);
      });
      if (result.results.length > 5) {
        console.log(`  ... and ${result.results.length - 5} more`);
      }
    }

    // Get stats after processing
    const statsAfter = await service.getRefreshStats();
    console.log("\n📊 Post-execution Stats:");
    console.log(`  Users still needing refresh: ${statsAfter.usersNeedingRefresh}`);

    if (result.failed > 0) {
      console.log(`\n⚠️  Warning: ${result.failed} users failed to refresh`);
      process.exit(CONFIG.EXIT_ERROR);
    }

    console.log("\n✅ Credit refresh completed successfully!");
    console.log("=".repeat(60));
    process.exit(CONFIG.EXIT_SUCCESS);

  } catch (error) {
    console.error("\n❌ Fatal error during credit refresh:", error);
    console.log("=".repeat(60));
    process.exit(CONFIG.EXIT_ERROR);
  }
}

// Run the job
runRefreshJob();
