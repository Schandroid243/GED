import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { WorkflowStep } from '../../types/job.types';

interface JobTimelineProps {
  steps: WorkflowStep[];
  className?: string;
}

function StepIcon({ status }: { status: WorkflowStep['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />;
    case 'failed':
      return <XCircleIcon className="h-5 w-5" style={{ color: 'var(--color-danger)' }} />;
    case 'active':
    case 'waiting':
    case 'delayed':
    default:
      return <ClockIcon className="h-5 w-5 text-[var(--color-text-muted)]" />;
  }
}

function StepConnector({ isLast }: { isLast: boolean }) {
  if (isLast) return null;
  return (
    <div
      className="absolute top-6 left-2.5 w-0.5 h-full -translate-x-1/2"
      style={{ background: 'var(--color-border)' }}
    />
  );
}

export function JobTimeline({ steps, className }: JobTimelineProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className={cn('relative space-y-0', className)}>
      <AnimatePresence mode="popLayout">
        {steps.map((step, idx) => (
          <motion.div
            key={`${step.step}-${step.timestamp}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {/* Dot + connector */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center',
                  'bg-[var(--color-bg-surface)]',
                )}
              >
                <StepIcon status={step.status} />
              </div>
              <StepConnector isLast={idx === steps.length - 1} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {step.step}
              </p>
              <p className="text-2xs text-[var(--color-text-muted)] mt-0.5">
                {format(new Date(step.timestamp), 'Pp', { locale: fr })}
              </p>
              {step.details && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {step.details}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
