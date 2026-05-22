import {
  DocumentTextIcon,
  QueueListIcon,
  CheckBadgeIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { cn, formatBytes } from '../../lib/utils';
import type { KpiStats } from '../../types/api.types';

interface ProcessingStatsChartProps {
  stats: KpiStats;
  className?: string;
}

interface StatBar {
  label: string;
  value: number;
  unit: string;
  max: number;
  icon: typeof DocumentTextIcon;
  color: string;
  displayValue: string;
}

export function ProcessingStatsChart({ stats, className }: ProcessingStatsChartProps) {
  const bars: StatBar[] = [
    {
      label: 'Documents traités',
      value: stats.documentsToday,
      unit: 'docs',
      max: Math.max(stats.documentsToday, 100),
      icon: DocumentTextIcon,
      color: 'var(--color-accent)',
      displayValue: stats.documentsToday.toString(),
    },
    {
      label: 'Taux réussite OCR',
      value: stats.ocrSuccessRate,
      unit: '%',
      max: 100,
      icon: CheckBadgeIcon,
      color: stats.ocrSuccessRate > 95 ? 'var(--color-success)' : 'var(--color-warning)',
      displayValue: `${stats.ocrSuccessRate}%`,
    },
    {
      label: 'Jobs en attente',
      value: Math.min(stats.jobsWaiting, 1000),
      unit: 'jobs',
      max: 1000,
      icon: QueueListIcon,
      color: stats.jobsWaiting > 500 ? 'var(--color-danger)' : 'var(--color-info)',
      displayValue: stats.jobsWaiting.toString(),
    },
    {
      label: 'Stockage utilisé',
      value: Math.min(stats.storageUsedBytes, 10_737_418_240), // cap à 10 Go
      unit: 'o',
      max: 10_737_418_240, // 10 Go
      icon: ArchiveBoxIcon,
      color: 'var(--color-accent)',
      displayValue: formatBytes(stats.storageUsedBytes),
    },
  ];

  if (!stats) {
    return (
      <div className={cn('card p-6', className)}>
        <p className="text-sm text-[var(--color-text-muted)] text-center">
          Aucune statistique disponible
        </p>
      </div>
    );
  }

  return (
    <div className={cn('card p-5 space-y-5', className)}>
      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
        Statistiques de traitement
      </h3>

      {bars.map((bar) => {
        const Icon = bar.icon;
        const pct = Math.min(100, Math.round((bar.value / bar.max) * 100));

        return (
          <div key={bar.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {bar.label}
                </span>
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {bar.displayValue}
              </span>
            </div>

            {/* Barre proportionnelle */}
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-subtle)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: bar.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
