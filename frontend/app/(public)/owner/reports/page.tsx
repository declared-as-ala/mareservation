'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOwnerRevenue, type RevenueReport, type MonthStat, type DayStat } from '@/lib/api/owner-reports';
import { apiFetch } from '@/lib/api/client';
import {
  TrendingUp,
  CalendarDays,
  Moon,
  BarChart3,
  Percent,
  XCircle,
  Building2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0 }).format(Math.round(n));
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-amber-400',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <p className={cn('mt-3 text-2xl font-bold', color)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function BarChart({ data, labelKey, valueKey }: {
  data: (MonthStat | DayStat)[];
  labelKey: 'month' | 'day';
  valueKey: 'revenue';
}) {
  const max = Math.max(...data.map((d) => (d as any)[valueKey] as number), 1);
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex items-end gap-1.5 min-w-0" style={{ height: 120 }}>
        {data.map((d) => {
          const val = (d as any)[valueKey] as number;
          const pct = (val / max) * 100;
          const label = labelKey === 'month' ? MONTH_NAMES[((d as MonthStat).month ?? 1) - 1] : String((d as DayStat).day);
          return (
            <div
              key={(d as any)[labelKey]}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ minWidth: labelKey === 'day' ? 8 : 24, height: '100%' }}
            >
              {val > 0 && (
                <div className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-200 group-hover:block z-10">
                  {fmt(val)} TND
                </div>
              )}
              <div
                className="w-full rounded-sm bg-amber-500/80 transition-all duration-300 hover:bg-amber-400"
                style={{ height: `${Math.max(pct, val > 0 ? 2 : 0)}%` }}
              />
              <span className="mt-1 text-center text-[9px] text-zinc-600 leading-none">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OwnerReportsPage() {
  const now = new Date();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [venueId, setVenueId] = useState('');

  const { data: venuesData } = useQuery({
    queryKey: ['owner-venues'],
    queryFn: () => apiFetch('/owner/venues'),
  });
  const venues: { _id: string; name: string }[] = Array.isArray((venuesData as any)?.data)
    ? (venuesData as any).data
    : Array.isArray(venuesData)
    ? (venuesData as any[])
    : [];

  const queryParams = useMemo(
    () => ({ venueId: venueId || undefined, period, year, month: period === 'month' ? month : undefined }),
    [venueId, period, year, month],
  );

  const { data: report, isLoading } = useQuery<RevenueReport>({
    queryKey: ['owner-revenue', queryParams],
    queryFn: () => fetchOwnerRevenue(queryParams),
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = MONTH_NAMES.map((label, i) => ({ value: i + 1, label }));

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Rapports & Revenus</h1>
          <p className="mt-1 text-sm text-zinc-500">Analysez vos performances et revenus par période.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-4">
          {/* Venue picker */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Établissement</label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="">Tous mes établissements</option>
              {venues.map((v) => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Period switcher */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Période</label>
            <div className="flex overflow-hidden rounded-lg border border-zinc-700">
              {(['month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition',
                    period === p
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100',
                  )}
                >
                  {p === 'month' ? 'Ce mois' : 'Cette année'}
                </button>
              ))}
            </div>
          </div>

          {/* Year selector */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Année</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month selector (month view only) */}
          {period === 'month' && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Mois</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
              >
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : !report ? null : (
          <>
            {/* KPI Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                label="Revenu total"
                value={`${fmt(report.totalRevenue)} TND`}
                icon={TrendingUp}
                color="text-emerald-400"
              />
              <KpiCard
                label="Réservations"
                value={String(report.reservationCount)}
                sub="séjours complétés"
                icon={CalendarDays}
                color="text-amber-400"
              />
              <KpiCard
                label="Nuits vendues"
                value={String(report.totalNights)}
                sub="nuits au total"
                icon={Moon}
                color="text-amber-300"
              />
              <KpiCard
                label="ADR (tarif moyen/nuit)"
                value={`${fmt(report.avgDailyRate)} TND`}
                sub="par nuit"
                icon={BarChart3}
                color="text-blue-400"
              />
              <KpiCard
                label="Taux d'occupation"
                value={`${report.occupancyRate.toFixed(1)} %`}
                icon={Percent}
                color="text-purple-400"
              />
              <KpiCard
                label="Taux d'annulation"
                value={`${report.cancellationRate.toFixed(1)} %`}
                icon={XCircle}
                color={report.cancellationRate > 20 ? 'text-red-400' : 'text-zinc-300'}
              />
            </div>

            {/* Revenue Chart */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6">
              <h2 className="mb-1 text-lg font-semibold text-zinc-100">
                Revenu par {period === 'year' ? 'mois' : 'jour'}
              </h2>
              <p className="mb-2 text-xs text-zinc-500">
                Passez la souris sur une barre pour voir le montant exact.
              </p>
              {period === 'year' && report.byMonth.length > 0 ? (
                <BarChart data={report.byMonth} labelKey="month" valueKey="revenue" />
              ) : period === 'month' && report.byDay.length > 0 ? (
                <BarChart data={report.byDay} labelKey="day" valueKey="revenue" />
              ) : (
                <p className="py-8 text-center text-sm text-zinc-500">Aucune donnée.</p>
              )}
            </div>

            {/* By Room Type */}
            {report.byRoomType.length > 0 && (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6">
                <h2 className="mb-4 text-lg font-semibold text-zinc-100">Revenus par type de chambre</h2>
                <div className="space-y-3">
                  {report.byRoomType.map((rt) => (
                    <div key={rt.type} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10">
                          <Building2 className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{rt.type}</p>
                          <p className="text-xs text-zinc-500">{rt.count} réservation{rt.count > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-emerald-400">{fmt(rt.revenue)} TND</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Rooms */}
            {report.topRooms.length > 0 && (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6">
                <h2 className="mb-4 text-lg font-semibold text-zinc-100">Top chambres</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {['#', 'Chambre', 'Nuits vendues', 'Revenu'].map((h) => (
                          <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {report.topRooms.map((r, i) => (
                        <tr key={r.roomId} className="hover:bg-zinc-900/40">
                          <td className="py-3 text-zinc-500">{i + 1}</td>
                          <td className="py-3 font-medium text-zinc-100">{r.name}</td>
                          <td className="py-3 text-zinc-400">{r.nights} nuits</td>
                          <td className="py-3 font-semibold text-emerald-400">{fmt(r.revenue)} TND</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
