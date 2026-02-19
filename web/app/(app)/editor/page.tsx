import TypstEditor from '@/components/typst/typst-editor';

export default function EditorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editor</h1>
        <p className="text-muted-foreground">
          WASM Typst editor for professional academic documents.
        </p>
      </div>
      <TypstEditor />
    </div>
  );
}
