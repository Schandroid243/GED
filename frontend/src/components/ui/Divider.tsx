import { cn } from '../../lib/utils';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn(
          'inline-block w-px h-full min-h-[1em]',
          'bg-[var(--color-border)]',
          className,
        )}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator" aria-orientation="horizontal">
        <span className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">{label}</span>
        <span className="flex-1 h-px bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <hr
      className={cn('border-t border-[var(--color-border)]', className)}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}
