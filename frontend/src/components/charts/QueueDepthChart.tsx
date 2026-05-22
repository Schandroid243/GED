import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { EmptyState } from '../ui/EmptyState';
import { useQueueStats } from '../../hooks/useJobs';

interface QueueDepthDataPoint {
  timestamp: string;
  queueName: string;
  depth: number;
}

interface QueueDepthChartProps {
  data?: QueueDepthDataPoint[];
  className?: string;
}

const QUEUE_COLORS: Record<string, string> = {
  'document-ingestion': '#426e42',
  'ocr-extraction': '#1e4d78',
  'classification': '#b5621a',
  'indexing': '#2d6a4f',
  'workflow-engine': '#1e4d78',
  'notification': '#9b1c1c',
  'archive': '#78746f',
  'dead-letter': '#9b1c1c',
};

const QUEUE_LABELS: Record<string, string> = {
  'document-ingestion': 'Ingestion',
  'ocr-extraction': 'OCR',
  'classification': 'Classification',
  'indexing': 'Indexation',
  'workflow-engine': 'Workflow',
  'notification': 'Notification',
  'archive': 'Archive',
  'dead-letter': 'Dead Letter',
};

const CHART_HEIGHT = 200;
const CHART_WIDTH = 500;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

function buildChartData(data: QueueDepthDataPoint[]) {
  if (data.length === 0) return { lines: [], yMax: 10, xLabels: [] };

  // Grouper par file
  const byQueue = new Map<string, { x: number; y: number }[]>();
  const timestamps = [...new Set(data.map((d) => d.timestamp))].sort();
  const xLabels = timestamps.map((t) => {
    const date = new Date(t);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  });

  for (const point of data) {
    const x = timestamps.indexOf(point.timestamp);
    if (x === -1) continue;
    if (!byQueue.has(point.queueName)) {
      byQueue.set(point.queueName, []);
    }
    byQueue.get(point.queueName)!.push({ x, y: point.depth });
  }

  let yMax = 10;
  for (const points of byQueue.values()) {
    for (const p of points) {
      if (p.y > yMax) yMax = p.y;
    }
  }
  yMax = Math.ceil(yMax * 1.2) || 10;

  const lines = Array.from(byQueue.entries()).map(([name, points]) => ({
    name,
    points: points.sort((a, b) => a.x - b.x),
    color: QUEUE_COLORS[name] ?? '#a09c97',
  }));

  return { lines, yMax, xLabels };
}

function scaleX(x: number, maxX: number): number {
  if (maxX <= 1) return PADDING.left + (CHART_WIDTH - PADDING.left - PADDING.right) / 2;
  return PADDING.left + (x / (maxX - 1)) * (CHART_WIDTH - PADDING.left - PADDING.right);
}

function scaleY(y: number, yMax: number): number {
  if (yMax === 0) return CHART_HEIGHT - PADDING.bottom;
  return CHART_HEIGHT - PADDING.bottom - (y / yMax) * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
}

export function QueueDepthChart({ data, className }: QueueDepthChartProps) {
  const { data: queueStats, isLoading } = useQueueStats();

  // Construire les données temps réel depuis queueStats
  const realtimeData: QueueDepthDataPoint[] = useMemo(() => {
    if (!queueStats || queueStats.length === 0) return data ?? [];
    const now = new Date().toISOString();
    return queueStats.map((q) => ({
      timestamp: now,
      queueName: q.name,
      depth: q.waiting + q.active,
    }));
  }, [queueStats, data]);

  const { lines, yMax, xLabels } = useMemo(
    () => buildChartData(realtimeData),
    [realtimeData],
  );

  if (isLoading || !realtimeData || realtimeData.length === 0) {
    return (
      <div className={cn('card p-6', className)}>
        <EmptyState
          title="Aucune donnée"
          description="Les métriques des files apparaîtront ici"
        />
      </div>
    );
  }

  const maxX = Math.max(1, xLabels.length);
  const yLines = 4;
  const yStep = Math.max(1, Math.ceil(yMax / yLines));

  return (
    <div className={cn('card p-4', className)}>
      <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
        Profondeur des files (temps réel)
      </h3>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grille horizontale */}
        {Array.from({ length: yLines + 1 }).map((_, idx) => {
          const yVal = yStep * idx;
          const y = scaleY(yVal, yMax);
          return (
            <g key={`grid-${idx}`}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px]"
                fill="var(--color-text-muted)"
              >
                {yVal}
              </text>
            </g>
          );
        })}

        {/* Labels X */}
        {xLabels.map((label, idx) => {
          const step = Math.max(1, Math.floor(xLabels.length / 6));
          if (idx % step !== 0) return null;
          const x = scaleX(idx, maxX);
          return (
            <text
              key={`xlabel-${idx}`}
              x={x}
              y={CHART_HEIGHT - 4}
              textAnchor="middle"
              className="text-[10px]"
              fill="var(--color-text-muted)"
            >
              {label}
            </text>
          );
        })}

        {/* Lignes des files */}
        {lines.map((line) => {
          if (line.points.length < 2) return null;
          const pathData = line.points
            .map((p, idx) => {
              const x = scaleX(p.x, maxX);
              const y = scaleY(p.y, yMax);
              return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <path
              key={line.name}
              d={pathData}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Dots sur les dernières valeurs */}
        {lines.map((line) => {
          if (line.points.length === 0) return null;
          const last = line.points[line.points.length - 1];
          const x = scaleX(last.x, maxX);
          const y = scaleY(last.y, yMax);
          return (
            <circle
              key={`dot-${line.name}`}
              cx={x}
              cy={y}
              r={3}
              fill={line.color}
              stroke="var(--color-bg-surface)"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 mt-3">
        {lines.map((line) => (
          <div key={line.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: line.color }}
            />
            <span className="text-2xs text-[var(--color-text-muted)]">
              {QUEUE_LABELS[line.name] ?? line.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
