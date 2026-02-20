'use client';

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { DocumentCard } from "@/components/documents/document-card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocuments, useDeleteDocument, useUpdateDocument } from "@/hooks/use-documents";

export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useDocuments();
  const deleteDocument = useDeleteDocument();
  const updateDocument = useUpdateDocument();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleDelete = (id: string) => {
    setSelectedDocId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDocId) {
      deleteDocument.mutate(selectedDocId);
      setDeleteDialogOpen(false);
      setSelectedDocId(null);
    }
  };

  const handleEdit = (id: string, currentTitle: string) => {
    setSelectedDocId(id);
    setEditTitle(currentTitle);
    setEditDialogOpen(true);
  };

  const confirmEdit = () => {
    if (selectedDocId && editTitle.trim()) {
      updateDocument.mutate({ id: selectedDocId, data: { title: editTitle.trim() } });
      setEditDialogOpen(false);
      setSelectedDocId(null);
      setEditTitle("");
    }
  };

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

      {isLoading && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive p-8 text-center">
          <p className="text-destructive">Failed to load documents. Please try again.</p>
        </div>
      )}

      {!isLoading && !error && documents && documents.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No documents yet. Create your first document to get started.</p>
        </div>
      )}

      {!isLoading && !error && documents && documents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              template={doc.template}
              citationFormat={doc.citationFormat}
              lastAccessedAt={doc.lastAccessedAt}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit document title</DialogTitle>
            <DialogDescription>
              Enter a new title for your document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter document title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEdit} disabled={!editTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
