'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Undo, Redo } from 'lucide-react';
import { toolbarButtons } from '@/lib/editor/toolbar-config';
import { EditorView } from '@codemirror/view';
import { applyFormat } from '@/lib/editor/actions';
import { undo, redo } from '@/lib/editor/history-actions';

interface FormattingToolbarProps {
  editorView: EditorView | null;
}

export function FormattingToolbar({ editorView }: FormattingToolbarProps) {
  const handleFormat = (format: string) => {
    if (!editorView) return;
    
    const button = toolbarButtons.find(b => b.id === format);
    if (button) {
      applyFormat(editorView, button.format);
    }
  };

  const handleUndo = () => {
    if (!editorView) return;
    undo(editorView);
  };

  const handleRedo = () => {
    if (!editorView) return;
    redo(editorView);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-1 px-2">
        {toolbarButtons.map((button, index) => (
          <div key={button.id} className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFormat(button.id)}
              title={button.tooltip}
              className="h-8 w-8"
            >
              <button.icon className="h-4 w-4" />
            </Button>
            {/* Add separator after underline and numbered-list */}
            {(index === 1 || index === 4) && (
              <Separator orientation="vertical" className="mx-1 h-4" />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUndo}
          title="Undo (Ctrl+Z)"
          className="h-8 w-8"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRedo}
          title="Redo (Ctrl+Y)"
          className="h-8 w-8"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
