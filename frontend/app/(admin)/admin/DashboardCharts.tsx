'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAdminStats,
  fetchAdminReservations,
  fetchAdminVenues,
  fetchAdminUsers,
  fetchAdminEvents,
} from '@/lib/api/admin';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Users,
  CalendarDays,
  CircleDollarSign,
  Ticket,
  BedDouble,
  Armchair,
  ArrowUpRight,
  Clock3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { VENUE_TYPE_LABELS } from '@/app/constants/venueTypes';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#ec4899'];

const CONFIRMED = ['confirmed', 'completed', 'checked_in', 'paid'];
const isConfirmed = (s: unknown) => CONFIRMED.includes(String(s).toLowerCase());

function fmtTND(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} TND`;
}
function rDate(r: any): Date {
  return new Date(r.createdAt ?? r.startAt ?? r.startDate ?? Date.now());
}
function bookingBucket(r: any): 'TABLE' | 'ROOM' | 'SEAT' {
  const t = String(r.bookingType || 'TABLE').toUpperCase();
  return t === 'ROOM' ? 'ROOM' : t === 'SEAT' ? 'SEAT' : 'TABLE';
}

// ── Tooltips ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur">
      {label && <p className="mb-1.5 text-xs font-semibold text-zinc-200">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="font-bold text-white">
            {currency || entry.dataKey === 'revenue' ? fmtTND(Number(entry.value)) : Number(entry.value).toLocaleString('fr-FR')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  delta?: number | null;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
      <div className={cn('absolute -right-6 -top-6 size-24 rounded-full blur-3xl', tone)} />
      <div className="relative flex items-start justify-between">
        <div className={cn('flex size-10 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/60')}>
          <Icon className="size-5 text-zinc-200" />
        </div>
        {delta != null && Number.isFinite(delta) && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
              up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-black leading-none tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-300">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function DashboardCharts() {
  const { data: stats } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchAdminStats });
  const { data: reservations = [], isLoading: lr } = useQuery({ queryKey: ['admin', 'reservations'], queryFn: () => fetchAdminReservations() });
  const { data: venues = [], isLoading: lv } = useQuery({ queryKey: ['admin', 'venues'], queryFn: () => fetchAdminVenues() });
  const { data: users = [], isLoading: lu } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => fetchAdminUsers() });
  const { data: events = [], isLoading: le } = useQuery({ queryKey: ['admin', 'events'], queryFn: () => fetchAdminEvents() });

  const isLoading = lr || lv || lu || le;
  const rList = reservations as any[];
  const vList = venues as any[];
  const uList = users as any[];
  const eList = events as any[];

  const metrics = useMemo(() => {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const inThisMonth = (d: Date) => d >= startThisMonth;
    const inLastMonth = (d: Date) => d >= startLastMonth && d < startThisMonth;
    const pct = (cur: number, prev: number) => (prev <= 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);

    // Revenue
    let revenueTotal = 0, revThis = 0, revLast = 0;
    let resThis = 0, resLast = 0;
    const revByBucket = { TABLE: 0, ROOM: 0, SEAT: 0 };
    for (const r of rList) {
      const d = rDate(r);
      const paid = isConfirmed(r.status);
      const amt = Number(r.totalPrice || 0);
      if (paid) {
        revenueTotal += amt;
        revByBucket[bookingBucket(r)] += amt;
        if (inThisMonth(d)) revThis += amt;
        else if (inLastMonth(d)) revLast += amt;
      }
      if (inThisMonth(d)) resThis += 1;
      else if (inLastMonth(d)) resLast += 1;
    }

    // New users
    let usersThis = 0, usersLast = 0;
    for (const u of uList) {
      const d = new Date(u.createdAt ?? Date.now());
      if (inThisMonth(d)) usersThis += 1;
      else if (inLastMonth(d)) usersLast += 1;
    }

    // 30-day series
    const days: { key: string; label: string; reservations: number; revenue: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      idx.set(key, days.length);
      days.push({ key, label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), reservations: 0, revenue: 0 });
    }
    for (const r of rList) {
      const d = rDate(r);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const i = idx.get(key);
      if (i != null) {
        days[i].reservations += 1;
        if (isConfirmed(r.status)) days[i].revenue += Number(r.totalPrice || 0);
      }
    }

    // Venue types
    const typeCount: Record<string, number> = {};
    for (const v of vList) typeCount[v.type || 'AUTRE'] = (typeCount[v.type || 'AUTRE'] || 0) + 1;
    const venueTypeData = Object.entries(typeCount).map(([t, c]) => ({ name: VENUE_TYPE_LABELS[t] || t, value: c }));

    // Status
    const statusCount: Record<string, number> = {};
    for (const r of rList) {
      const s = String(r.status || 'autre').toLowerCase();
      statusCount[s] = (statusCount[s] || 0) + 1;
    }
    const STATUS_FR: Record<string, string> = { confirmed: 'Confirmées', pending: 'En attente', cancelled: 'Annulées', completed: 'Terminées', checked_in: 'Check-in', paid: 'Payées', expired: 'Expirées' };
    const statusData = Object.entries(statusCount).map(([s, c]) => ({ name: STATUS_FR[s] || s, value: c }));

    // Top venues
    const venueCount: Record<string, number> = {};
    for (const r of rList) {
      const name = typeof r.venueId === 'object' ? r.venueId?.name : undefined;
      if (name) venueCount[name] = (venueCount[name] || 0) + 1;
    }
    const topVenues = Object.entries(venueCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
    const topMax = topVenues[0]?.count ?? 1;

    // Recent reservations
    const recent = [...rList].sort((a, b) => rDate(b).getTime() - rDate(a).getTime()).slice(0, 6);

    return {
      revenueTotal, revThis, revLast,
      resThis, resLast,
      usersThis, usersLast,
      revByBucket,
      days,
      venueTypeData,
      statusData,
      topVenues, topMax,
      recent,
      deltas: {
        revenue: pct(revThis, revLast),
        reservations: pct(resThis, resLast),
        users: pct(usersThis, usersLast),
      },
    };
  }, [rList, vList, uList]);

  const revenueByCategory = [
    { name: 'Tables', revenue: metrics.revByBucket.TABLE, icon: 'table' },
    { name: 'Chambres', revenue: metrics.revByBucket.ROOM, icon: 'room' },
    { name: 'Billets / Places', revenue: metrics.revByBucket.SEAT, icon: 'seat' },
  ];

  const totalRes = stats?.totalReservations ?? rList.length;
  const totalUsers = stats?.totalUsers ?? uList.length;
  const totalVenues = stats?.totalVenues ?? vList.length;
  const totalEvents = stats?.totalEvents ?? eList.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />)}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-72 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenu confirmé" value={fmtTND(metrics.revenueTotal)} sub={`${fmtTND(metrics.revThis)} ce mois`} icon={CircleDollarSign} tone="bg-amber-500/20" delta={metrics.deltas.revenue} />
        <KpiCard label="Réservations" value={totalRes.toLocaleString('fr-FR')} sub={`${metrics.resThis} ce mois`} icon={CalendarDays} tone="bg-blue-500/20" delta={metrics.deltas.reservations} />
        <KpiCard label="Utilisateurs" value={totalUsers.toLocaleString('fr-FR')} sub={`+${metrics.usersThis} ce mois`} icon={Users} tone="bg-violet-500/20" delta={metrics.deltas.users} />
        <KpiCard label="Lieux actifs" value={totalVenues.toLocaleString('fr-FR')} sub={`${totalEvents} événements`} icon={MapPin} tone="bg-emerald-500/20" />
      </div>

      {/* ── Trend area: reservations + revenue (30d) ── */}
      <SectionCard
        title="Activité des 30 derniers jours"
        subtitle="Réservations et revenu confirmé par jour"
        action={
          <div className="hidden items-center gap-4 sm:flex">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="size-2.5 rounded-full bg-amber-400" /> Revenu</span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="size-2.5 rounded-full bg-blue-400" /> Réservations</span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={metrics.days} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} interval={4} minTickGap={20} />
            <YAxis yAxisId="left" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
            <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={44} hide />
            <Tooltip content={<ChartTooltip />} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenu" stroke="#f59e0b" strokeWidth={2} fill="url(#gRev)" />
            <Area yAxisId="left" type="monotone" dataKey="reservations" name="Réservations" stroke="#3b82f6" strokeWidth={2} fill="url(#gRes)" />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Distributions ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Lieux par type" subtitle={`${vList.length} établissements`}>
          {metrics.venueTypeData.length === 0 ? (
            <EmptyChart icon={MapPin} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={metrics.venueTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={2} dataKey="value">
                  {metrics.venueTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <Legend data={metrics.venueTypeData} />
        </SectionCard>

        <SectionCard title="Revenu par catégorie" subtitle="Tables · Chambres · Billets" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByCategory} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
              <Bar dataKey="revenue" name="Revenu" radius={[8, 8, 0, 0]} maxBarSize={80}>
                {revenueByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Status + Top venues + Recent ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Réservations par statut" subtitle={`${rList.length} au total`}>
          {metrics.statusData.length === 0 ? (
            <EmptyChart icon={Calendar} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.statusData} layout="vertical" margin={{ left: 8, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} width={86} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="value" name="Réservations" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Top établissements" subtitle="Par nombre de réservations">
          {metrics.topVenues.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-600">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {metrics.topVenues.map((v, i) => (
                <div key={v.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate text-zinc-300">
                      <span className="grid size-5 place-items-center rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-400">{i + 1}</span>
                      <span className="truncate">{v.name}</span>
                    </span>
                    <span className="shrink-0 font-bold text-amber-300">{v.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${(v.count / metrics.topMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Dernières réservations" subtitle="Activité récente">
          {metrics.recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-600">Aucune réservation</p>
          ) : (
            <div className="space-y-2">
              {metrics.recent.map((r: any, i: number) => {
                const b = bookingBucket(r);
                const Icon = b === 'ROOM' ? BedDouble : b === 'SEAT' ? Ticket : Armchair;
                const vname = typeof r.venueId === 'object' ? r.venueId?.name : 'Lieu';
                const who = [r.customerFirstName, r.customerLastName].filter(Boolean).join(' ') || r.guestName || '—';
                return (
                  <div key={r._id ?? i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-200">{vname}</p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-zinc-500"><Clock3 className="size-3" />{rDate(r).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {who}</p>
                    </div>
                    {r.totalPrice ? <span className="shrink-0 text-xs font-bold text-amber-300">{fmtTND(Number(r.totalPrice))}</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function EmptyChart({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center text-zinc-600">
      <Icon className="mb-2 size-8" />
      <p className="text-sm">Aucune donnée disponible</p>
    </div>
  );
}

function Legend({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5">
      {data.slice(0, 6).map((d, i) => (
        <div key={d.name} className="flex items-center justify-between gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 truncate text-zinc-400">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="truncate">{d.name}</span>
          </span>
          <span className="shrink-0 font-semibold text-zinc-300">{Math.round((d.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
