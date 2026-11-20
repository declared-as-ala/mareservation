'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONTHS_FR, WEEKDAYS_FR, monthStartKey, monthWeeks, parseKey } from '@/lib/booking/dates';
import type { DayStatus } from '@/lib/api/bookings';

export const STATUS_LABEL: Record<DayStatus, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  pending: 'En attente de confirmation',
  blocked: 'Bloqué',
  past: 'Date passée',
  unconfigured: 'Non configuré',
};

const STATUS_STYLE: Record<DayStatus, string> = {
  available: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30',
  reserved: 'border-red-500/30 bg-red-500/15 text-red-300',
  pending: 'border-orange-500/30 bg-orange-500/15 text-orange-300',
  blocked: 'border-zinc-500/30 bg-zinc-500/20 text-zinc-400',
  past: 'border-transparent text-white/20',
  unconfigured: 'border-white/[0.06] text-white/25',
};

export interface CalendarCellInfo {
  status: DayStatus;
  /** Extra short text under the number (e.g. a guest name in management views). */
  caption?: string;
}

interface Props {
  /** First day of the first month shown (any day inside it works). */
  month: string;
  onMonthChange: (monthStart: string) => void;
  /** How many months are shown side by side. */
  months?: 1 | 2;
  days: Record<string, CalendarCellInfo | undefined>;
  selection?: { start?: string | null; end?: string | null };
  /** Whether a day can be clicked at all. Default: everything except past / unconfigured. */
  isClickable?: (key: string, info: CalendarCellInfo | undefined) => boolean;
  onDayClick?: (key: string) => void;
  loading?: boolean;
  className?: string;
  /** Hide the legend (e.g. when the parent renders its own). */
  hideLegend?: boolean;
}

export function CalendarLegend({ className }: { className?: string }) {
  const items: [DayStatus, string][] = [
    ['available', 'bg-emerald-500'],
    ['reserved', 'bg-red-500'],
    ['pending', 'bg-orange-500'],
    ['blocked', 'bg-zinc-500'],
  ];
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-400', className)} aria-label="Légende">
      {items.map(([s, dot]) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', dot)} aria-hidden="true" />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}

function MonthGrid({
  monthKey, days, selection, isClickable, onDayClick,
}: { monthKey: string } & Pick<Props, 'days' | 'selection' | 'isClickable' | 'onDayClick'>) {
  const { y, m } = parseKey(monthKey);
  const weeks = monthWeeks(monthKey);
  const start = selection?.start ?? null;
  const end = selection?.end ?? null;

  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-3 text-center font-serif text-lg font-bold capitalize text-white">
        {MONTHS_FR[m]} {y}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`${MONTHS_FR[m]} ${y}`}>
        {WEEKDAYS_FR.map((w) => (
          <div key={w} role="columnheader" className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {w}
          </div>
        ))}
        {weeks.flat().map((key, i) => {
          if (!key) return <div key={`pad-${i}`} role="gridcell" />;
          const info = days[key];
          const status: DayStatus = info?.status ?? 'unconfigured';
          const clickable = isClickable ? isClickable(key, info) : status !== 'past' && status !== 'unconfigured';
          const isStart = key === start;
          const isEnd = key === end;
          const inRange = !!(start && end && key > start && key < end);
          const day = parseKey(key).d;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={!clickable}
              onClick={() => onDayClick?.(key)}
              aria-label={`${day} ${MONTHS_FR[m]} ${y} — ${STATUS_LABEL[status]}${isStart ? ' — arrivée' : ''}${isEnd ? ' — départ' : ''}`}
              aria-pressed={isStart || isEnd || inRange}
              className={cn(
                'relative flex aspect-square min-h-[40px] flex-col items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400',
                STATUS_STYLE[status],
                !clickable && 'cursor-not-allowed',
                inRange && 'border-amber-400/40 bg-amber-400/25 text-amber-100',
                (isStart || isEnd) && 'border-amber-300 bg-amber-400 text-black hover:bg-amber-400'
              )}
            >
              <span>{day}</span>
              {info?.caption && <span className="absolute inset-x-0.5 bottom-0.5 truncate text-[9px] font-medium leading-none opacity-80">{info.caption}</span>}
              {isStart && <span className="absolute -bottom-0.5 text-[8px] font-bold uppercase leading-none">arr.</span>}
              {isEnd && <span className="absolute -bottom-0.5 text-[8px] font-bold uppercase leading-none">dép.</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({
  month, onMonthChange, months = 1, days, selection, isClickable, onDayClick, loading, className, hideLegend,
}: Props) {
  const first = monthStartKey(month);
  const shown = Array.from({ length: months }, (_, i) => monthStartKey(first, i));
  return (
    <div className={cn('relative', className)} aria-busy={loading}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(monthStartKey(first, -1))}
          aria-label="Mois précédent"
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          <ChevronLeft className="size-5" />
        </button>
        {!hideLegend && <CalendarLegend className="hidden justify-center sm:flex" />}
        <button
          type="button"
          onClick={() => onMonthChange(monthStartKey(first, 1))}
          aria-label="Mois suivant"
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className={cn('flex flex-col gap-6 transition-opacity', months === 2 && 'md:flex-row', loading && 'opacity-60')}>
        {shown.map((k, i) => (
          <div key={k} className={cn('flex-1', i > 0 && months === 2 && 'hidden md:block')}>
            <MonthGrid monthKey={k} days={days} selection={selection} isClickable={isClickable} onDayClick={onDayClick} />
          </div>
        ))}
      </div>
      {!hideLegend && <CalendarLegend className="mt-4 sm:hidden" />}
    </div>
  );
}
