import { cn } from '../../lib/utils';

interface DocumentViewerProps {
  filePath: string;
  mimeType: string;
  className?: string;
}

export function DocumentViewer({ filePath, mimeType, className }: DocumentViewerProps) {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  const fileUrl = `${baseUrl}/files/${filePath}`;

  // PDF → iframe
  if (mimeType === 'application/pdf') {
    return (
      <div className={cn('w-full h-full min-h-[400px] rounded-xl overflow-hidden', className)}>
        <iframe
          src={fileUrl}
          className="w-full h-full rounded-xl border-0"
          title="Prévisualisation PDF"
          loading="lazy"
        />
      </div>
    );
  }

  // Images → <img>
  if (mimeType.startsWith('image/')) {
    return (
      <div
        className={cn(
          'w-full h-full min-h-[300px] flex items-center justify-center rounded-xl overflow-hidden',
          'bg-[var(--color-bg-subtle)]',
          className,
        )}
      >
        <img
          src={fileUrl}
          alt="Prévisualisation du document"
          className="max-w-full max-h-full object-contain rounded-xl"
          loading="lazy"
        />
      </div>
    );
  }

  // Autres formats → message non supporté
  return (
    <div
      className={cn(
        'w-full h-full min-h-[200px] flex flex-col items-center justify-center rounded-xl',
        'bg-[var(--color-bg-subtle)] border border-[var(--color-border)]',
        className,
      )}
    >
      <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
        Prévisualisation non disponible
      </p>
      <p className="text-2xs text-[var(--color-text-muted)]">
        Format : {mimeType}
      </p>
    </div>
  );
}
