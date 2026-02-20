import { Plus } from "lucide-react";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { Button } from "@/components/ui/button";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Create and manage your academic documents.
          </p>
        </div>
        <CreateDocumentDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </CreateDocumentDialog>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No documents yet. Create your first document to get started.</p>
      </div>
    </div>
  );
}
