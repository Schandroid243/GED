import { useState, useCallback } from 'react';
import { ListBulletIcon, Squares2X2Icon, PlusIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { DocumentFilters, type DocumentFiltersState } from '../components/documents/DocumentFilters';
import { DocumentTable } from '../components/documents/DocumentTable';
import { DocumentCard } from '../components/documents/DocumentCard';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useDocuments } from '../hooks/useDocuments';
import { cn } from '../lib/utils';

type ViewMode = 'list' | 'grid';

export function DocumentsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<DocumentFiltersState>({});

  const queryParams = {
    page,
    limit: 20,
    status: filters.status,
    type: filters.type,
    search: filters.search,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sort: sortField,
    order: sortOrder,
  };

  const { data, isLoading } = useDocuments(queryParams);

  const handleFilterChange = useCallback((newFilters: DocumentFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleUploadComplete = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const documents = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Déposer un document
          </Button>
        }
      />

      {/* Filtres */}
      <DocumentFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Toggle vue + compteur */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          {total} document{total !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1 bg-[var(--color-bg-surface)] rounded-lg border border-[var(--color-border)] p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md transition-colors duration-100',
              viewMode === 'list'
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            )}
            title="Vue liste"
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-md transition-colors duration-100',
              viewMode === 'grid'
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            )}
            title="Vue grille"
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* Vue liste */}
      {!isLoading && viewMode === 'list' && (
        <>
          {documents.length === 0 ? (
            <EmptyState
              title="Aucun document"
              description="Déposez votre premier document pour commencer"
              action={<Button variant="primary" onClick={() => setDrawerOpen(true)}>Déposer</Button>}
            />
          ) : (
            <DocumentTable
              data={documents}
              total={total}
              page={page}
              limit={20}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </>
      )}

      {/* Vue grille */}
      {!isLoading && viewMode === 'grid' && (
        <>
          {documents.length === 0 ? (
            <EmptyState
              title="Aucun document"
              description="Déposez votre premier document pour commencer"
              action={<Button variant="primary" onClick={() => setDrawerOpen(true)}>Déposer</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Drawer Upload */}
      <Drawer
        open={drawerOpen}
        title="Déposer un document"
        onClose={() => setDrawerOpen(false)}
      >
        <DocumentUpload onUploadComplete={handleUploadComplete} />
      </Drawer>
    </div>
  );
}
