import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700   dark:bg-amber-900/30  dark:text-amber-400',
  danger:  'bg-red-50    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  info:    'bg-blue-50   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  accent:  'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
