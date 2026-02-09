// Remove the bloat (formatting logic)
// This file is now empty or can contain simple Citation related types if needed.
// For now, we rely on Source having a citationKey.

export interface Citation {
  sourceId: string;
  citationKey: string;
  page?: number;
}
