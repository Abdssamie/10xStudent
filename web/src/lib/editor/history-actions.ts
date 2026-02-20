/**
 * CodeMirror history actions
 * Provides undo/redo functionality
 */

import { EditorView } from '@codemirror/view';
import { undo as cmUndo, redo as cmRedo } from '@codemirror/commands';

/**
 * Undo the last change
 */
export function undo(view: EditorView): void {
  cmUndo(view);
  view.focus();
}

/**
 * Redo the last undone change
 */
export function redo(view: EditorView): void {
  cmRedo(view);
  view.focus();
}
