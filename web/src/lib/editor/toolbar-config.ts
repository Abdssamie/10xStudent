/**
 * Toolbar configuration
 * Defines the structure and behavior of formatting toolbar buttons
 */

import { LucideIcon, Italic, Underline, Heading, List, ListOrdered, Sigma, Code, AtSign } from 'lucide-react';
import { TypstFormatType } from './typst-formatting';

export interface ToolbarButton {
  id: string;
  icon: LucideIcon;
  label: string;
  format: TypstFormatType;
  tooltip: string;
  shortcut?: string;
}

export const toolbarButtons: ToolbarButton[] = [
  {
    id: 'italic',
    icon: Italic,
    label: 'Italic',
    format: 'italic',
    tooltip: 'Italic (Ctrl+I)',
    shortcut: 'Ctrl+I',
  },
  {
    id: 'underline',
    icon: Underline,
    label: 'Underline',
    format: 'underline',
    tooltip: 'Underline (Ctrl+U)',
    shortcut: 'Ctrl+U',
  },
  {
    id: 'heading',
    icon: Heading,
    label: 'Heading',
    format: 'heading',
    tooltip: 'Heading (Ctrl+H)',
    shortcut: 'Ctrl+H',
  },
  {
    id: 'bullet-list',
    icon: List,
    label: 'Bullet List',
    format: 'bullet-list',
    tooltip: 'Bullet List (Ctrl+Shift+8)',
    shortcut: 'Ctrl+Shift+8',
  },
  {
    id: 'numbered-list',
    icon: ListOrdered,
    label: 'Numbered List',
    format: 'numbered-list',
    tooltip: 'Numbered List (Ctrl+Shift+7)',
    shortcut: 'Ctrl+Shift+7',
  },
  {
    id: 'math',
    icon: Sigma,
    label: 'Math',
    format: 'math',
    tooltip: 'Math Equation (Ctrl+M)',
    shortcut: 'Ctrl+M',
  },
  {
    id: 'code',
    icon: Code,
    label: 'Code',
    format: 'code',
    tooltip: 'Inline Code (Ctrl+`)',
    shortcut: 'Ctrl+`',
  },
  {
    id: 'mention',
    icon: AtSign,
    label: 'Mention',
    format: 'mention',
    tooltip: 'Mention/Reference (@)',
    shortcut: '@',
  },
];
