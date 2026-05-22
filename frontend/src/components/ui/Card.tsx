import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={cn(
        'card',
        paddingStyles[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
