/**
 * CodeMirror editor actions
 * Provides functions to manipulate editor content programmatically
 */

import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { wrapWithFormat, getEmptyFormat, isLintFormat, TypstFormatType, FormatOptions } from './typst-formatting';

/**
 * Applies formatting to the current selection or cursor position
 */
export function applyFormat(
  view: EditorView,
  format: TypstFormatType,
  options?: FormatOptions
): void {
  const state = view.state;
  const selection = state.selection.main;
  const selectedText = state.doc.sliceString(selection.from, selection.to);

  if (selectedText) {
    // Text is selected - wrap it with formatting
    const formattedText = wrapWithFormat(selectedText, format, options);
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: formattedText,
      },
      selection: EditorSelection.range(
        selection.from,
        selection.from + formattedText.length
      ),
    });
  } else {
    // No selection - insert empty format and position cursor
    const { text, cursorOffset } = getEmptyFormat(format, options);
    
    // For line-based formats, check if we're at the start of a line
    let insertPos = selection.from;
    if (isLintFormat(format)) {
      const line = state.doc.lineAt(selection.from);
      insertPos = line.from;
    }
    
    view.dispatch({
      changes: {
        from: insertPos,
        to: insertPos,
        insert: text,
      },
      selection: EditorSelection.cursor(insertPos + cursorOffset),
    });
  }
  
  view.focus();
}

/**
 * Inserts text at the current cursor position
 */
export function insertText(view: EditorView, text: string): void {
  const state = view.state;
  const selection = state.selection.main;
  
  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: text,
    },
    selection: EditorSelection.cursor(selection.from + text.length),
  });
  
  view.focus();
}

/**
 * Gets the current selection text
 */
export function getSelectedText(view: EditorView): string {
  const state = view.state;
  const selection = state.selection.main;
  return state.doc.sliceString(selection.from, selection.to);
}

/**
 * Checks if text is currently selected
 */
export function hasSelection(view: EditorView): boolean {
  const selection = view.state.selection.main;
  return selection.from !== selection.to;
}
