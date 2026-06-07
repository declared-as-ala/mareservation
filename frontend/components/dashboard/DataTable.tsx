'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  /** Unique key. */
  key: string;
  header: string;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /** Sort accessor — enables sorting on this column. */
  sortValue?: (row: T) => string | number;
  /** Hide on mobile (card view always shows it under a label). */
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyLabel?: string;
}

/**
 * Generic dashboard table: sortable headers, pagination, an empty state,
 * and a responsive card layout on mobile.
 */
export function DataTable<T>({
  columns,
  rows,
  keyField,
  onRowClick,
  pageSize = 12,
  emptyLabel = 'Aucune donnée',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const acc = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = acc(a), vb = acc(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] py-14 text-center">
        <Inbox className="size-9 text-neutral-700" />
        <p className="text-sm text-neutral-600">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={cn(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sortValue && 'cursor-pointer select-none hover:text-neutral-300'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key &&
                      (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={keyField(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-white/[0.04] last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-white/[0.03]'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-neutral-300',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {pageRows.map((row) => (
          <div
            key={keyField(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5',
              onRowClick && 'cursor-pointer active:bg-white/[0.04]'
            )}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3 py-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-600">
                  {col.header}
                </span>
                <span className="text-right text-sm text-neutral-300">{col.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} sur {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-neutral-400 transition-colors hover:border-white/20 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 font-medium text-neutral-400">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
              className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-neutral-400 transition-colors hover:border-white/20 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
