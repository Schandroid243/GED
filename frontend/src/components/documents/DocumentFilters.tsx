import { useCallback, useState } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

type FilterValue = string | undefined;

export interface DocumentFiltersState {
  search?: string;
  type?: FilterValue;
  status?: FilterValue;
  dateFrom?: string;
  dateTo?: string;
}

interface DocumentFiltersProps {
  filters: DocumentFiltersState;
  onFilterChange: (filters: DocumentFiltersState) => void;
  className?: string;
}

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'INVOICE', label: 'Facture' },
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'ID_CARD', label: 'Pièce d\'identité' },
  { value: 'RECEIPT', label: 'Reçu' },
  { value: 'REPORT', label: 'Rapport' },
  { value: 'UNKNOWN', label: 'Non classifié' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'RECEIVED', label: 'Reçu' },
  { value: 'OCR_IN_PROGRESS', label: 'OCR en cours' },
  { value: 'OCR_COMPLETED', label: 'OCR terminé' },
  { value: 'CLASSIFIED', label: 'Classifié' },
  { value: 'INDEXED', label: 'Indexé' },
  { value: 'ARCHIVED', label: 'Archivé' },
  { value: 'DOCUMENT_ERROR', label: 'Erreur' },
];

export function DocumentFilters({ filters, onFilterChange, className }: DocumentFiltersProps) {
  const [localFilters, setLocalFilters] = useState<DocumentFiltersState>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = useCallback(
    (key: keyof DocumentFiltersState, value: string) => {
      const newFilters = { ...localFilters, [key]: value || undefined };
      setLocalFilters(newFilters);
      onFilterChange(newFilters);
    },
    [localFilters, onFilterChange],
  );

  const handleReset = useCallback(() => {
    const empty: DocumentFiltersState = {};
    setLocalFilters(empty);
    onFilterChange(empty);
  }, [onFilterChange]);

  const hasActiveFilters = Object.values(localFilters).some((v) => v !== undefined && v !== '');

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom de document…"
            value={localFilters.search ?? ''}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative"
        >
          <FunnelIcon className="h-4 w-4" />
          Filtres
          {hasActiveFilters && (
            <span
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl card animate-fade-in">
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            value={localFilters.type ?? ''}
            onChange={(e) => updateFilter('type', e.target.value)}
          />
          <Select
            label="Statut"
            options={STATUS_OPTIONS}
            value={localFilters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          />
          <Input
            label="Du"
            type="date"
            value={localFilters.dateFrom ?? ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
          />
          <Input
            label="Au"
            type="date"
            value={localFilters.dateTo ?? ''}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
          />

          {hasActiveFilters && (
            <div className="md:col-span-4 flex justify-end">
              <Button variant="ghost" onClick={handleReset} size="sm">
                <XMarkIcon className="h-4 w-4" />
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
