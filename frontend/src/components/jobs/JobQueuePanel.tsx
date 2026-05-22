import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { useQueueStats } from '../../hooks/useJobs';
import type { QueueStats } from '../../types/job.types';

interface JobQueuePanelProps {
  className?: string;
  onSelectQueue?: (name: string) => void;
}

const columnHelper = createColumnHelper<QueueStats>();

const columns = [
  columnHelper.accessor('name', {
    header: 'File',
    cell: ({ getValue }) => (
      <span className="text-sm font-mono text-[var(--color-text-primary)]">
        {getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('waiting', {
    header: 'En attente',
    cell: ({ getValue }) => (
      <Badge variant="warning">{getValue()}</Badge>
    ),
  }),
  columnHelper.accessor('active', {
    header: 'Actifs',
    cell: ({ getValue }) => (
      <Badge variant="info">{getValue()}</Badge>
    ),
  }),
  columnHelper.accessor('completed', {
    header: 'Terminés',
    cell: ({ getValue }) => (
      <Badge variant="success">{getValue()}</Badge>
    ),
  }),
  columnHelper.accessor('failed', {
    header: 'Échoués',
    cell: ({ getValue }) => (
      <Badge variant="danger">{getValue()}</Badge>
    ),
  }),
  columnHelper.accessor('delayed', {
    header: 'Différés',
    cell: ({ getValue }) => (
      <Badge variant="default">{getValue()}</Badge>
    ),
  }),
];

export function JobQueuePanel({ className, onSelectQueue }: JobQueuePanelProps) {
  const navigate = useNavigate();
  const { data: queues, isLoading } = useQueueStats();

  const table = useReactTable({
    data: queues ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (queueName: string) => {
    if (onSelectQueue) {
      onSelectQueue(queueName);
    } else {
      navigate(`/jobs?queue=${encodeURIComponent(queueName)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!queues || queues.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Aucune file disponible</p>
      </div>
    );
  }

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                )}
                onClick={() => handleRowClick(row.original.name)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
