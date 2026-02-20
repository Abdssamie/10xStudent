'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface DocumentCardProps {
  id: string;
  title: string;
  template: string;
  citationFormat: string;
  lastAccessedAt: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}

const templateLabels: Record<string, string> = {
  'research-paper': 'Research Paper',
  'report': 'Report',
  'essay': 'Essay',
  'article': 'Article',
  'notes': 'Notes',
};

export function DocumentCard({
  id,
  title,
  template,
  citationFormat,
  lastAccessedAt,
  onDelete,
  onEdit,
}: DocumentCardProps) {
  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <Link href={`/documents/${id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(id, title);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit title
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(id);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {templateLabels[template] || template}
            </span>
            <span>•</span>
            <span>{citationFormat}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last accessed {formatDistanceToNow(new Date(lastAccessedAt), { addSuffix: true })}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
