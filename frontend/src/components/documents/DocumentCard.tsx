import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  PhotoIcon,
  DocumentIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { Document } from '../../types/document.types';

interface DocumentCardProps {
  document: Document;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return DocumentTextIcon;
  if (mimeType.startsWith('image/')) return PhotoIcon;
  return DocumentIcon;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  return mimeType.split('/').pop()?.toUpperCase() ?? 'Fichier';
}

export function DocumentCard({ document: doc, className }: DocumentCardProps) {
  const navigate = useNavigate();
  const Icon = getFileIcon(doc.mimeType);

  return (
    <button
      onClick={() => navigate(`/documents/${doc.id}`)}
      className={cn(
        'card p-5 text-left w-full transition-all duration-150',
        'hover:shadow-[var(--shadow-modal)] hover:-translate-y-0.5',
        'border-t-4',
        className,
      )}
      style={{
        borderTopColor: 'var(--color-accent)',
      }}
    >
      {/* Icon + Badge row */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-accent-muted)' }}
        >
          <Icon className="h-5 w-5" style={{ color: 'var(--color-accent-text)' }} />
        </div>
        <DocumentStatusBadge status={doc.status} />
      </div>

      {/* Nom du document */}
      <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate mb-1">
        {doc.originalName}
      </h3>

      {/* Type et date */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-2xs text-[var(--color-text-muted)]">
          <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)]">
            {getFileTypeLabel(doc.mimeType)}
          </span>
          {doc.documentType && (
            <span>{doc.documentType}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-2xs text-[var(--color-text-muted)]">
          <ClockIcon className="h-3 w-3" />
          <span>il y a {formatDistanceToNow(new Date(doc.createdAt), { locale: fr })}</span>
        </div>
      </div>

      {/* Metadata tags */}
      {doc.metadata && Object.keys(doc.metadata).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {Object.entries(doc.metadata).slice(0, 3).map(([key, value]) => (
            <span
              key={key}
              className="text-2xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-muted)',
              }}
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      {/* Date complète en bas */}
      <p className="text-2xs text-[var(--color-text-muted)] mt-3">
        {format(new Date(doc.createdAt), 'Pp', { locale: fr })}
      </p>
    </button>
  );
}
