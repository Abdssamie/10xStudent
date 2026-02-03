/**
 * @id: script-model
 * @priority: medium
 * @progress: 0
 * @spec: Python code snippet for Pyodide. Defines strict `inputs` (variables from Typst) and `outputs` (charts/tables).
 * @skills: ["typescript", "python"]
 */
export interface Script {
    id: string;
    documentId: string;
    name: string;
    content: string; // Python code
    inputs: ScriptVariable[];
    outputs: ScriptVariable[];
    lastRunAt?: Date;
}

export interface ScriptVariable {
    name: string;
    type: 'string' | 'number' | 'json' | 'image';
    description?: string;
}

/**
 * @id: script-execution-policy
 * @priority: high
 * @progress: 0
 * @spec: Security configuration. `timeoutMs` (max 500ms), `memoryLimit`, `allowedModules`.
 * @skills: ["web-security"]
 */
export interface ScriptExecutionPolicy {
    timeoutMs: number; // e.g. 500
    maxMemoryBytes: number;
    allowedModules: string[]; // e.g. ['matplotlib', 'numpy', 'pandas']
    allowNetworkAccess: boolean; // Should be false
}
