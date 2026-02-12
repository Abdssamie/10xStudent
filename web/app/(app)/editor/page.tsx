export default function EditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editor</h1>
        <p className="text-muted-foreground">
          WASM Typst editor for professional academic documents.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Select a document to start editing.</p>
      </div>
    </div>
  );
}
