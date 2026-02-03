/**
 * @id: asset-model
 * @priority: medium
 * @progress: 0
 * @spec: Reference to uploaded files. `url`, `path`, `mimeType`.
 * @skills: ["typescript"]
 */
export interface Asset {
    id: string;
    projectId: string;
    url: string;
    storagePath: string;
    mimeType: string;
    fileName: string;
    /**
     * User-provided or AI-generated context description.
     */
    description?: string;
    createdAt: Date;
}
