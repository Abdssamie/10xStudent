'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Please configure it in your environment variables.');
}

interface Document {
  id: string;
  userId: string;
  title: string;
  template: string;
  typstKey: string;
  citationFormat: string;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

interface CreateDocumentInput {
  title: string;
  template: string;
  citationFormat: string;
}

interface DocumentContent {
  content: string;
}

async function fetchDocuments(token: string | null): Promise<Document[]> {
  const response = await fetch(`${API_URL}/api/v1/documents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  return response.json();
}

async function createDocument(input: CreateDocumentInput, token: string | null): Promise<Document> {
  const response = await fetch(`${API_URL}/api/v1/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create document');
  }

  return response.json();
}

async function deleteDocument(id: string, token: string | null): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}

async function updateDocument(id: string, data: { title: string }, token: string | null): Promise<Document> {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update document');
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

export function useDocuments() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const token = await getToken();
      return fetchDocuments(token);
    },
  });
}

export function useCreateDocument() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      const token = await getToken();
      return createDocument(input, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document created successfully');
    },
    onError: () => {
      toast.error('Failed to create document');
    },
  });
}

export function useDeleteDocument() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return deleteDocument(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });
}

export function useUpdateDocument() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string } }) => {
      const token = await getToken();
      return updateDocument(id, data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document updated successfully');
    },
    onError: () => {
      toast.error('Failed to update document');
    },
  });
}

export function useDocumentContent(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['documents', id, 'content'],
    queryFn: async () => {
      const token = await getToken();
      return fetchDocumentContent(id, token);
    },
    enabled: !!id,
  });
}

export function useUpdateDocumentContent() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const token = await getToken();
      return updateDocumentContent(id, content, token);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.id, 'content'] });
    },
  });
}
