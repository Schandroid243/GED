import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-2', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-2xs text-[var(--color-text-muted)]">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span>/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-[var(--color-text-secondary)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title + actions row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-display text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
