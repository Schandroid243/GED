import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  DocumentTextIcon,
  PhotoIcon,
  DocumentIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { Spinner } from '../ui/Spinner';
import type { Document, DocumentListResponse } from '../../types/document.types';

interface DocumentTableProps {
  data?: Document[];
  total?: number;
  page?: number;
  limit?: number;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  onSelectionChange?: (ids: string[]) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return DocumentTextIcon;
  if (mimeType.startsWith('image/')) return PhotoIcon;
  return DocumentIcon;
}

function formatFileSize(mimeType: string, _filePath: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  return mimeType;
}

export function DocumentTable({
  data = [],
  total = 0,
  page = 1,
  limit = 20,
  isLoading = false,
  onPageChange,
  onSortChange,
  onSelectionChange,
}: DocumentTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const columnHelper = createColumnHelper<Document>();

  const columns = useMemo<ColumnDef<Document>[]>(
    () => [
      // Checkbox de sélection
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 40,
      }),

      // Nom du document avec icône
      columnHelper.accessor('originalName', {
        header: 'Nom',
        cell: ({ row }) => {
          const Icon = getFileIcon(row.original.mimeType);
          return (
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--color-bg-subtle)] flex items-center justify-center">
                <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">
                  {row.original.originalName}
                </p>
                <p className="text-2xs text-[var(--color-text-muted)]">
                  {formatFileSize(row.original.mimeType, row.original.filePath)}
                </p>
              </div>
            </div>
          );
        },
      }),

      // Statut
      columnHelper.accessor('status', {
        header: 'Statut',
        cell: ({ getValue }) => <DocumentStatusBadge status={getValue()} />,
      }),

      // Type de document
      columnHelper.accessor('documentType', {
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue();
          return (
            <span className="text-sm text-[var(--color-text-secondary)]">
              {type ?? '—'}
            </span>
          );
        },
      }),

      // Date
      columnHelper.accessor('createdAt', {
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
            {format(new Date(getValue()), 'Pp', { locale: fr })}
          </span>
        ),
      }),

      // Actions
      columnHelper.display({
        id: 'actions',
        cell: () => (
          <button
            className="btn-ghost p-1 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </button>
        ),
        size: 40,
      }),
    ],
    [columnHelper],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      if (newSorting.length > 0 && onSortChange) {
        onSortChange(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc');
      }
    },
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      if (onSelectionChange) {
        onSelectionChange(Object.keys(newSelection));
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    rowCount: total,
  });

  const handleRowClick = useCallback(
    (documentId: string) => {
      navigate(`/documents/${documentId}`);
    },
    [navigate],
  );

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="divide-y divide-[var(--color-border)]">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="h-4 w-4 rounded bg-[var(--color-bg-subtle)]" />
              <div className="h-8 w-8 rounded-lg bg-[var(--color-bg-subtle)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-[var(--color-bg-subtle)]" />
                <div className="h-3 w-24 rounded bg-[var(--color-bg-subtle)]" />
              </div>
              <div className="h-5 w-20 rounded-full bg-[var(--color-bg-subtle)]" />
              <div className="h-4 w-16 rounded bg-[var(--color-bg-subtle)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-6 py-3 text-left text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-[var(--color-text-secondary)]',
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <div className="flex flex-col">
                          <ChevronUpIcon
                            className={cn(
                              'h-3 w-3 -mb-1',
                              header.column.getIsSorted() === 'asc'
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-muted)]',
                            )}
                          />
                          <ChevronDownIcon
                            className={cn(
                              'h-3 w-3',
                              header.column.getIsSorted() === 'desc'
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-muted)]',
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'cursor-pointer transition-colors duration-100',
                  'hover:bg-[var(--color-bg-subtle)]',
                  row.getIsSelected() && 'bg-[var(--color-accent-muted)]',
                )}
                onClick={() => handleRowClick(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-3 whitespace-nowrap"
                    style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          {total} document{total !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost p-1.5 rounded-lg disabled:opacity-30"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            className="btn-ghost p-1.5 rounded-lg disabled:opacity-30"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
