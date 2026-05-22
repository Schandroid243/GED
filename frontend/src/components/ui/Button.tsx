import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] focus-visible:ring-[var(--color-accent)]',
  secondary: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] focus-visible:ring-[var(--color-border-strong)]',
  ghost:     'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus-visible:ring-[var(--color-border-strong)]',
  danger:    'bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg',
          'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
