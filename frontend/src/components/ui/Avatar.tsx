import { cn } from '../../lib/utils';

type Size = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: Size;
  className?: string;
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeStyles[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium',
        'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
        sizeStyles[size],
        className,
      )}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
