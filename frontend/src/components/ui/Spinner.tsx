import { cn } from '../../lib/utils';

type Size = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: Size;
  className?: string;
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        'border-[var(--color-border-strong)] border-t-[var(--color-accent)]',
        sizeStyles[size],
        className,
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}
