import { StructuredDocument } from './structured-document';

/**
 * @id: document-model
 * @priority: high
 * @progress: 0
 * @spec: Core entity. Contains raw Typst content, type ('thesis', 'resume'), and compilation status.
 * @skills: ["typescript"]
 */
export interface Document {
    id: string;
    projectId: string;
    title: string;
    themeId: string;
    /**
     * The structured content of the document (Intermediate Representation).
     */
    structure: StructuredDocument;
    content?: string; // Raw Typst content (optional/cached)
    type: 'thesis' | 'resume' | 'report' | 'general';
    status: 'draft' | 'compiling' | 'success' | 'error';
    version: number;
    updatedAt: Date;
}
