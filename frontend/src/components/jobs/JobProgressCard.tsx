import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { shortId } from '../../lib/utils';
import type { JobRecord } from '../../types/job.types';

interface JobProgressCardProps {
  job: JobRecord;
  progress?: number;
  className?: string;
}

const STATUS_BADGE_VARIANT = {
  waiting:   'warning' as const,
  active:    'info' as const,
  completed: 'success' as const,
  failed:    'danger' as const,
  delayed:   'default' as const,
  paused:    'default' as const,
};

const STATUS_LABEL: Record<string, string> = {
  waiting:   'En attente',
  active:    'En cours',
  completed: 'Terminé',
  failed:    'Échoué',
  delayed:   'Différé',
  paused:    'En pause',
};

export function JobProgressCard({ job, progress = 0, className }: JobProgressCardProps) {
  const elapsed = formatDistanceToNow(new Date(job.createdAt), { locale: fr, addSuffix: true });

  return (
    <Card padding="md" className={cn('space-y-3', className)}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {job.jobName}
          </p>
          {job.correlationId && (
            <p className="text-2xs font-mono text-[var(--color-text-muted)] mt-0.5">
              {shortId(job.correlationId)}
            </p>
          )}
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[job.status]}>
          {STATUS_LABEL[job.status]}
        </Badge>
      </div>

      {/* Progress */}
      {job.status === 'active' && (
        <ProgressBar
          value={progress}
          label="Progression"
        />
      )}

      {/* Failed reason */}
      {job.status === 'failed' && job.failedReason && (
        <p className="text-xs text-danger line-clamp-2">
          {job.failedReason}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-2xs text-[var(--color-text-muted)]">
        <span>Tentative {job.attemptsMade}</span>
        <span>{elapsed}</span>
      </div>
    </Card>
  );
}
