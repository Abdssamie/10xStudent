'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import type { DocumentResponse as Document, DocumentContentResponse as DocumentContent } from '@shared/src';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Please configure it in your environment variables.');
}

async function fetchDocument(id: string, token: string | null): Promise<Document> {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }

  return response.json();
}

async function fetchDocumentContent(id: string, token: string | null): Promise<DocumentContent> {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}/content`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch document content');
  }

  return response.json();
}

async function updateDocumentContent(id: string, content: string, token: string | null): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}/content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error('Failed to update document content');
  }

  return response.json();
}

export function useDocument(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const token = await getToken();
      return fetchDocument(id, token);
    },
    enabled: !!id,
  });
}

export function useDocumentContent(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['document-content', id],
    queryFn: async () => {
      const token = await getToken();
      return fetchDocumentContent(id, token);
    },
    enabled: !!id,
  });
}

export function useUpdateDocumentContent(id: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const token = await getToken();
      return updateDocumentContent(id, content, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-content', id] });
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
    onError: () => {
      toast.error('Failed to save document');
    },
  });
}
