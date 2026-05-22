import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

/** Statistiques temps réel des files BullMQ (polling 5s) */
export function useQueueStats() {
  return useQuery({
    queryKey:        ['jobs', 'queues'],
    queryFn:         () => api.get('/jobs/queues').then((r) => r.data),
    refetchInterval: 5_000,
  });
}

/** Jobs individuels pour une file donnée */
export function useJobsByQueue(queueName: string) {
  return useQuery({
    queryKey:        ['jobs', 'queue', queueName],
    queryFn:         () => api.get(`/jobs/queues/${queueName}/jobs`).then((r) => r.data),
    enabled:         !!queueName,
    refetchInterval: 5_000,
  });
}

/** Workflow steps pour un document */
export function useDocumentWorkflow(documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId, 'workflow'],
    queryFn:  () => api.get(`/documents/${documentId}/workflow`).then((r) => r.data),
    enabled:  !!documentId,
  });
}
