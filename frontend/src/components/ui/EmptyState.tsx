import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--color-text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-display text-[var(--color-text-primary)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
