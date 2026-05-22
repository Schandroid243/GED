import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface DocumentListParams {
  page:     number;
  limit:    number;
  status?:  string;
  type?:    string;
  search?:  string;
  tenantId?: string;
}

/** Liste paginée des documents avec filtres */
export function useDocuments(params: DocumentListParams) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn:  () => api.get('/documents', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

/** Détail d'un document par ID */
export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn:  () => api.get(`/documents/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

/** Texte OCR d'un document */
export function useDocumentOcr(id: string) {
  return useQuery({
    queryKey: ['documents', id, 'ocr'],
    queryFn:  () => api.get(`/documents/${id}/ocr`).then((r) => r.data),
    enabled:  !!id,
  });
}

/** Mutation de suppression */
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** Mutation de changement de statut */
export function useUpdateDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/documents/${id}/status`, { status }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
