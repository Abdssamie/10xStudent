/**
 * @id: project-model
 * @priority: high
 * @progress: 0
 * @spec: Root container for documents. Single user ownership (No collaboration).
 * @skills: ["typescript", "zod"]
 */
export interface Project {
    id: string;
    userId: string;
    name: string;
    description?: string;
    config: ProjectConfig;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * @id: project-config
 * @priority: medium
 * @progress: 0
 * @spec: Typst compiler version, main file path, bibliography settings.
 * @skills: ["typescript", "zod"]
 */
export interface ProjectConfig {
    compilerVersion: string;
    mainFile: string;
    bibliography?: string[];
}
