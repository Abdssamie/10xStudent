'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  documentResponseSchema,
  type DocumentResponse,
  type CreateDocumentInput,
  documentContentResponseSchema,
  type DocumentContentResponse,
  type UpdateDocumentBody,
} from '@shared/src';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Please configure it in your environment variables.');
}

async function fetchDocuments(token: string | null): Promise<DocumentResponse[]> {
  const response = await fetch(`${API_URL}/api/v1/documents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  const data = await response.json();
  return z.array(documentResponseSchema).parse(data);
}

async function createDocument(input: CreateDocumentInput, token: string | null): Promise<DocumentResponse> {
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

  const data = await response.json();
  return documentResponseSchema.parse(data);
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

async function updateDocument(id: string, data: UpdateDocumentBody, token: string | null): Promise<DocumentResponse> {
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

  const json = await response.json();
  return documentResponseSchema.parse(json);
}

async function fetchDocumentContent(id: string, token: string | null): Promise<DocumentContentResponse> {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}/content`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch document content');
  }

  const data = await response.json();
  return documentContentResponseSchema.parse(data);
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
    mutationFn: async ({ id, data }: { id: string; data: UpdateDocumentBody }) => {
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
