import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({ value, max = 100, label, className, animated = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-2xs">
          <span className="text-[var(--color-text-muted)]">{label}</span>
          <span className="font-medium text-[var(--color-text-secondary)]">{pct}%</span>
        </div>
      )}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--color-bg-subtle)' }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full',
            animated && 'transition-all duration-500 ease-out',
          )}
          style={{
            width: `${pct}%`,
            background: 'var(--color-accent)',
          }}
        />
      </div>
    </div>
  );
}
