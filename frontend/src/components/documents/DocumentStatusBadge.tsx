import { Badge } from '../ui/Badge';
import type { DocumentStatus } from '../../types/document.types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const STATUS_VARIANT: Record<DocumentStatus, BadgeVariant> = {
  UPLOADING:       'default',
  RECEIVED:        'info',
  SCANNING:        'info',
  SCAN_FAILED:     'danger',
  OCR_IN_PROGRESS: 'warning',
  OCR_COMPLETED:   'success',
  OCR_PARTIAL:     'warning',
  CLASSIFIED:      'accent',
  INDEXED:         'success',
  ARCHIVED:        'default',
  DOCUMENT_ERROR:  'danger',
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  UPLOADING:       'Upload',
  RECEIVED:        'Reçu',
  SCANNING:        'Scan antivirus',
  SCAN_FAILED:     'Scan échoué',
  OCR_IN_PROGRESS: 'OCR en cours',
  OCR_COMPLETED:   'OCR terminé',
  OCR_PARTIAL:     'OCR partiel',
  CLASSIFIED:      'Classifié',
  INDEXED:         'Indexé',
  ARCHIVED:        'Archivé',
  DOCUMENT_ERROR:  'Erreur',
};

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
