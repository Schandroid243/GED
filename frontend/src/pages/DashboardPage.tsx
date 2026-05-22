import { useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  QueueListIcon,
  CheckBadgeIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/axios';
import { formatBytes } from '../lib/utils';
import { PageHeader } from '../components/layout/PageHeader';
import { JobQueuePanel } from '../components/jobs/JobQueuePanel';
import { QueueDepthChart } from '../components/charts/QueueDepthChart';
import { ProcessingStatsChart } from '../components/charts/ProcessingStatsChart';
import { Spinner } from '../components/ui/Spinner';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentStatusBadge } from '../components/documents/DocumentStatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { KpiStats } from '../types/api.types';
import type { Document } from '../types/document.types';

interface KpiCardProps {
  label: string;
  value: string;
  icon: typeof DocumentTextIcon;
  accent?: boolean;
}

function KpiCard({ label, value, icon: Icon, accent }: KpiCardProps) {
  return (
    <div
      className="card p-5 border-t-4"
      style={{
        borderTopColor: accent ? 'var(--color-accent)' : 'var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            {label}
          </p>
          <p
            className="text-3xl font-display font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-muted)' }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: 'var(--color-accent-text)' }}
          />
        </div>
      </div>
    </div>
  );
}

function RecentDocumentsTable({ documents }: { documents: Document[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-6 py-3 text-left text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {documents.slice(0, 5).map((doc) => (
              <tr key={doc.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                <td className="px-6 py-3">
                  <p className="text-sm text-[var(--color-text-primary)] truncate max-w-[200px]">
                    {doc.originalName}
                  </p>
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {doc.documentType ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <DocumentStatusBadge status={doc.status} />
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                    {format(new Date(doc.createdAt), 'Pp', { locale: fr })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: kpiStats, isLoading: kpiLoading } = useQuery<KpiStats>({
    queryKey: ['stats', 'kpi'],
    queryFn: () => api.get('/stats/kpi').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: recentDocs, isLoading: docsLoading } = useDocuments({
    page: 1,
    limit: 5,
  });

  const isLoading = kpiLoading || docsLoading;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Tableau de bord" />
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Documents traités"
          value={(kpiStats?.documentsToday ?? 0).toString()}
          icon={DocumentTextIcon}
          accent
        />
        <KpiCard
          label="Jobs en attente"
          value={(kpiStats?.jobsWaiting ?? 0).toString()}
          icon={QueueListIcon}
          accent={(kpiStats?.jobsWaiting ?? 0) > 500}
        />
        <KpiCard
          label="Réussite OCR"
          value={`${kpiStats?.ocrSuccessRate ?? 0}%`}
          icon={CheckBadgeIcon}
          accent={(kpiStats?.ocrSuccessRate ?? 100) > 95}
        />
        <KpiCard
          label="Stockage utilisé"
          value={formatBytes(kpiStats?.storageUsedBytes ?? 0)}
          icon={ArchiveBoxIcon}
          accent
        />
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QueueDepthChart />
        <ProcessingStatsChart
          stats={
            kpiStats ?? {
              documentsToday: 0,
              jobsWaiting: 0,
              ocrSuccessRate: 0,
              storageUsedBytes: 0,
            }
          }
        />
      </div>

      {/* Files de jobs */}
      <div>
        <h2 className="text-base font-medium text-[var(--color-text-primary)] mb-3">
          Files de jobs
        </h2>
        <JobQueuePanel />
      </div>

      {/* Activité récente */}
      <div>
        <h2 className="text-base font-medium text-[var(--color-text-primary)] mb-3">
          Activité récente
        </h2>
        {recentDocs?.data && recentDocs.data.length > 0 ? (
          <RecentDocumentsTable documents={recentDocs.data} />
        ) : (
          <div className="card p-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Aucun document récent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
