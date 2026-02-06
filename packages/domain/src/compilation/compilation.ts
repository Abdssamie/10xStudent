/**
 * @id: compilation-types
 * @priority: high
 * @progress: 100
 * @directive: Types for document compilation jobs and results
 * @context: specs/03-typst-document-engine-templates.md#compilation-api-endpoint
 * @spec: Types for document compilation jobs and results.
 * Note: projectId removed per spec - documents belong directly to users
 * @skills: ["typescript"]
 */

export interface CompilationJob {
  documentId: string;
  userId: string;
  options?: CompilationOptions;
}

export interface CompilationOptions {
  /** Output format */
  format?: "pdf" | "png";
  /** Include table of contents */
  includeTableOfContents?: boolean;
  /** Force recompilation (ignore cache) */
  force?: boolean;
}

export interface CompilationResult {
  status: "success" | "failed" | "pending";
  /** URL to compiled artifact */
  artifactUrl?: string;
  /** Compilation errors if failed */
  errors?: CompilationError[];
  /** Compilation warnings */
  warnings?: CompilationError[];
  /** Time taken to compile (ms) */
  duration?: number;
  /** When compilation completed */
  compiledAt?: Date;
}

export interface CompilationError {
  message: string;
  /** Source file where error occurred */
  file?: string;
  /** Line number (1-indexed) */
  line?: number;
  /** Column number (1-indexed) */
  column?: number;
  /** Hint for fixing the error */
  hint?: string;
}
