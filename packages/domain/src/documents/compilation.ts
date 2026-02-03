/**
 * @id: compilation-result
 * @priority: high
 * @progress: 0
 * @spec: Outcome of a Typst compile job. URL to PDF/Artifacts, duration.
 * @skills: ["typescript"]
 */
export interface CompilationResult {
    documentId: string;
    success: boolean;
    artifacts: {
        pdfUrl?: string;
        logUrl?: string;
    };
    durationMs: number;
    timestamp: Date;
}

/**
 * @id: compilation-error
 * @priority: medium
 * @progress: 0
 * @spec: Structured error info (line, column, message) for UI highlighting.
 * @skills: ["typescript"]
 */
export interface CompilationError {
    documentId: string;
    message: string;
    sourcePath?: string;
    line: number;
    column: number;
}
