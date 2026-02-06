/**
 * @id: compilation-processor
 * @priority: high
 * @progress: 0
 * @spec: Logic to process compilation jobs.
 * TODO: Implement compilation processor
 * @skills: ["typst", "typescript", "bullmq"]
 */

import { Job } from "bullmq";
import type { CompilationJob, CompilationResult } from "@10xstudent/domain";

export const processor = async (
  job: Job<CompilationJob>,
): Promise<CompilationResult> => {
  console.log(`[Compile] Job ${job.id} - Not implemented yet`);

  return {
    status: "failed",
    errors: [
      {
        message: "Compilation processor not implemented",
      },
    ],
    compiledAt: new Date(),
  };
};
