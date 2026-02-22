/**
 * Typst formatting utilities
 * Provides functions to generate Typst markup for various formatting operations
 */

export type TypstFormatType =
  | 'italic'
  | 'underline'
  | 'heading'
  | 'bullet-list'
  | 'numbered-list'
  | 'math'
  | 'code'
  | 'mention';

export interface FormatOptions {
  level?: number; // For headings (1-6)
}

/**
 * Wraps selected text with Typst formatting syntax
 */
export function wrapWithFormat(
  text: string,
  format: TypstFormatType,
  options?: FormatOptions
): string {
  switch (format) {
    case 'italic':
      return `_${text}_`;
    
    case 'underline':
      return `#underline[${text}]`;
    
    case 'heading': {
      const level = options?.level || 1;
      const prefix = '='.repeat(level);
      return `${prefix} ${text}`;
    }
    
    case 'bullet-list':
      return `- ${text}`;
    
    case 'numbered-list':
      return `+ ${text}`;
    
    case 'math':
      return `$${text}$`;
    
    case 'code':
      return `\`${text}\``;
    
    case 'mention':
      return `@${text}`;
    
    default:
      return text;
  }
}

/**
 * Generates Typst markup for empty formatting (when no text is selected)
 */
export function getEmptyFormat(
  format: TypstFormatType,
  options?: FormatOptions
): { text: string; cursorOffset: number } {
  switch (format) {
    case 'italic':
      return { text: '__', cursorOffset: 1 };
    
    case 'underline':
      return { text: '#underline[]', cursorOffset: 11 };
    
    case 'heading': {
      const level = options?.level || 1;
      const prefix = '='.repeat(level);
      return { text: `${prefix} `, cursorOffset: prefix.length + 1 };
    }
    
    case 'bullet-list':
      return { text: '- ', cursorOffset: 2 };
    
    case 'numbered-list':
      return { text: '+ ', cursorOffset: 2 };
    
    case 'math':
      return { text: '$$', cursorOffset: 1 };
    
    case 'code':
      return { text: '``', cursorOffset: 1 };
    
    case 'mention':
      return { text: '@', cursorOffset: 1 };
    
    default:
      return { text: '', cursorOffset: 0 };
  }
}

/**
 * Checks if the format should be applied at line start
 */
export function isLintFormat(format: TypstFormatType): boolean {
  return ['heading', 'bullet-list', 'numbered-list'].includes(format);
}
