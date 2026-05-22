import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/axios';
import { PageHeader } from '../components/layout/PageHeader';
import { JobQueuePanel } from '../components/jobs/JobQueuePanel';
import { JobProgressCard } from '../components/jobs/JobProgressCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import type { JobRecord, QueueName } from '../types/job.types';

export function JobsPage() {
  const queryClient = useQueryClient();
  const [selectedQueue, setSelectedQueue] = useState<QueueName | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  // Jobs d'une file spécifique
  const {
    data: jobs,
    isLoading: jobsLoading,
  } = useQuery<JobRecord[]>({
    queryKey: ['jobs', 'queues', selectedQueue, 'jobs'],
    queryFn: () =>
      api.get(`/jobs/queues/${selectedQueue}/jobs`).then((r) => r.data),
    enabled: !!selectedQueue,
    refetchInterval: 5_000,
  });

  // Mutation vider une file
  const clearQueueMutation = useMutation({
    mutationFn: (queueName: string) =>
      api.delete(`/jobs/queues/${queueName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'queues'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'queues', selectedQueue] });
      toast.success(`File "${confirmClear}" vidée avec succès`);
      setConfirmClear(null);
    },
    onError: (error: Error) => {
      toast.error(`Échec du vidage de la file : ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Files de jobs" />

      {/* Panel des files */}
      <JobQueuePanel
        onSelectQueue={(name) => setSelectedQueue(name as QueueName)}
      />

      {/* Détail d'une file sélectionnée */}
      {selectedQueue && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-[var(--color-text-primary)]">
              Jobs — <span className="font-mono text-sm">{selectedQueue}</span>
            </h2>
            <Button
              variant="ghost"
              onClick={() => setConfirmClear(selectedQueue)}
              className="text-danger"
            >
              Vider la file
            </Button>
          </div>

          {/* Liste des jobs */}
          {jobsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobProgressCard key={job.jobId} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucun job"
              description={`Aucun job actif ou récent dans la file "${selectedQueue}"`}
            />
          )}
        </div>
      )}

      {!selectedQueue && (
        <div className="card p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Sélectionnez une file de jobs ci-dessus pour voir ses détails
          </p>
        </div>
      )}

      {/* Modal de confirmation vidage */}
      <Modal
        open={!!confirmClear}
        onClose={() => setConfirmClear(null)}
        title="Vider la file"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Êtes-vous sûr de vouloir vider la file{' '}
            <span className="font-mono font-medium text-[var(--color-text-primary)]">
              {confirmClear}
            </span>
            {' '}? Cette action supprimera tous les jobs en attente et actifs.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmClear(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (confirmClear) clearQueueMutation.mutate(confirmClear);
              }}
              isLoading={clearQueueMutation.isPending}
              className="bg-danger hover:bg-danger-dark text-white"
            >
              Oui, vider la file
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
