'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toolbarButtons } from '@/lib/editor/toolbar-config';
import { EditorView } from '@codemirror/view';
import { applyFormat } from '@/lib/editor/actions';

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

  return (
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
  );
}
