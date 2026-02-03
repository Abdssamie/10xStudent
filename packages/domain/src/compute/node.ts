/**
 * @id: compute-node
 * @priority: high
 * @progress: 0
 * @spec: A distinct unit of computation (Python script) that produces outputs (data, images) for the document.
 * @skills: ["typescript", "python"]
 */
export interface ComputeNode {
    id: string;
    documentId: string;
    name: string;
    /**
     * The type of computation. Currently primarily 'python'.
     */
    type: 'python';
    /**
     * The actual Python code content.
     */
    code: string;
    /**
     * Defines the expected outputs of this script.
     */
    outputs: ComputeOutputDefinition[];
    executionPolicy?: ComputeExecutionPolicy;
}

export interface ComputeOutputDefinition {
    key: string; // e.g., "dataframe", "plot_fig"
    type: 'json' | 'image' | 'text' | 'csv';
}

export interface ComputeExecutionPolicy {
    timeoutMs: number;
    allowedModules: string[];
}
