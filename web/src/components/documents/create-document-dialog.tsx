'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateDocument } from '@/hooks/use-documents';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useRouter } from 'next/navigation';

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  template: z.enum(['research-paper', 'report', 'essay', 'article', 'notes']),
  citationFormat: z.enum(['APA', 'MLA', 'Chicago']),
});

type CreateDocumentForm = z.infer<typeof createDocumentSchema>;

interface CreateDocumentDialogProps {
  children: React.ReactNode;
}

export function CreateDocumentDialog({ children }: CreateDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const createDocument = useCreateDocument();
  const { settings } = useUserSettings();

  const defaultCitationFormat = settings?.preferences?.defaultCitationFormat || 'APA';

  const form = useForm<CreateDocumentForm>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: '',
      template: 'research-paper',
      citationFormat: defaultCitationFormat,
    },
  });

  useEffect(() => {
    if (settings?.preferences?.defaultCitationFormat) {
      form.setValue('citationFormat', settings.preferences.defaultCitationFormat);
    }
  }, [settings, form]);

  const onSubmit = async (data: CreateDocumentForm) => {
    createDocument.mutate(data, {
      onSuccess: (document) => {
        setOpen(false);
        form.reset();
        router.push(`/documents/${document.id}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
          <DialogDescription>
            Choose a template and citation format for your new document.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Research Paper" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="research-paper">Research Paper</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="citationFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Citation Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select citation format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APA">APA</SelectItem>
                      <SelectItem value="MLA">MLA</SelectItem>
                      <SelectItem value="Chicago">Chicago</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
             </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDocument.isPending}>
                {createDocument.isPending ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
