'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Ban,
  BarChart3,
  BedDouble,
  Building2,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Hotel,
  Info,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
  QrCode,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import {
  fetchHotelDashboard,
  checkInReservation,
  checkOutReservation,
  type HotelDashboardResponse,
  type DashboardReservation,
} from '@/lib/api/owner-hotel';

/* ─── helpers ─────────────────────────────────────────────────────── */

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
}
function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} DT`;
}
function getRoomLabel(r: DashboardReservation) {
  if (typeof r.roomId !== 'object' || !r.roomId) return '—';
  return r.roomId.name ?? `${r.roomId.roomType ?? 'Chambre'} · #${r.roomId.roomNumber ?? '?'}`;
}
function guestName(r: DashboardReservation) {
  return [r.guestFirstName, r.guestLastName].filter(Boolean).join(' ') || 'Client';
}

/* ─── page ────────────────────────────────────────────────────────── */

export default function HotelDashboardPage() {
  const qc = useQueryClient();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const { data: ownerData } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: fetchOwnerDashboard,
  });

  useEffect(() => {
    if (!selectedVenueId && ownerData?.venues?.length) {
      const first = ownerData.venues.find((v) => v.type === 'HOTEL') ?? ownerData.venues[0];
      setSelectedVenueId(first._id);
    }
  }, [ownerData, selectedVenueId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['hotel-dashboard', selectedVenueId],
    queryFn: () => fetchHotelDashboard(selectedVenueId!),
    enabled: !!selectedVenueId,
    refetchInterval: 60_000,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['hotel-dashboard'] });
  }

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      <Header
        venues={ownerData?.venues}
        selectedVenueId={selectedVenueId}
        onSelectVenue={setSelectedVenueId}
        venueName={data?.venue.name}
        venueCity={data?.venue.city}
      />

      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:py-8 space-y-6">
        {!selectedVenueId ? (
          <EmptyState icon={Hotel} title="Aucun hôtel rattaché à votre compte" />
        ) : isLoading ? (
          <DashboardSkeleton />
        ) : error || !data ? (
          <EmptyState icon={ShieldAlert} title="Impossible de charger le tableau de bord" />
        ) : (
          <>
            {/* KPI row */}
            <KpiGrid kpis={data.kpis} />

            {/* Alerts */}
            {data.alerts.length > 0 && <AlertsPanel alerts={data.alerts} />}

            {/* Quick links */}
            <QuickLinks />

            {/* Today columns */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TodayList
                title="Arrivées aujourd'hui"
                icon={LogIn}
                color="emerald"
                reservations={data.checkinsToday}
                emptyText="Aucune arrivée prévue aujourd'hui."
                renderAction={(r) => <CheckinButton reservation={r} onDone={refresh} />}
              />
              <TodayList
                title="Départs aujourd'hui"
                icon={LogOut}
                color="amber"
                reservations={data.checkoutsToday}
                emptyText="Aucun départ prévu aujourd'hui."
                renderAction={(r) => <CheckoutButton reservation={r} onDone={refresh} />}
              />
            </section>

            {/* Upcoming next 7 days */}
            {data.upcomingNext7.length > 0 && (
              <UpcomingTable reservations={data.upcomingNext7} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ─── header ──────────────────────────────────────────────────────── */

function Header({
  venues,
  selectedVenueId,
  onSelectVenue,
  venueName,
  venueCity,
}: {
  venues?: Array<{ _id: string; name: string; type?: string }>;
  selectedVenueId: string | null;
  onSelectVenue: (id: string) => void;
  venueName?: string;
  venueCity?: string;
}) {
  return (
    <header className="border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-xl sticky top-0 z-30">
      <div className="mx-auto max-w-[1400px] px-4 py-4 flex flex-wrap items-center gap-3">
        <Link
          href="/owner"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-amber-400 hover:border-amber-400/40 transition"
        >
          <ArrowLeft className="size-3.5" />
          Espace propriétaire
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Tableau de bord hôtel</p>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-white truncate">
            {venueName ?? 'Mon hôtel'}
          </h1>
          {venueCity && (
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
              <MapPin className="size-3" /> {venueCity}
            </p>
          )}
        </div>
        {venues && venues.length > 1 && (
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm">
            <Building2 className="size-4 text-neutral-500" />
            <select
              value={selectedVenueId ?? ''}
              onChange={(e) => onSelectVenue(e.target.value)}
              className="bg-transparent text-neutral-100 focus:outline-none text-xs"
            >
              {venues.map((v) => (
                <option key={v._id} value={v._id} className="bg-[#0C0C0C]">{v.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </header>
  );
}

/* ─── KPI grid ────────────────────────────────────────────────────── */

function KpiGrid({ kpis }: { kpis: HotelDashboardResponse['kpis'] }) {
  const items: Array<{
    label: string;
    value: string;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    accent?: 'amber' | 'emerald' | 'red' | 'neutral';
  }> = [
    { label: 'Arrivées aujourd\'hui', value: String(kpis.checkinsToday), icon: LogIn, accent: 'emerald' },
    { label: 'Départs aujourd\'hui', value: String(kpis.checkoutsToday), icon: LogOut, accent: 'amber' },
    {
      label: 'Chambres occupées',
      value: `${kpis.occupiedNow} / ${kpis.totalRooms}`,
      sub: `${kpis.availableNow} disponible${kpis.availableNow > 1 ? 's' : ''}`,
      icon: BedDouble,
    },
    {
      label: 'Demandes en attente',
      value: String(kpis.pending),
      icon: Clock,
      accent: kpis.pending > 0 ? 'red' : 'neutral',
    },
    {
      label: 'Revenu du mois',
      value: fmtMoney(kpis.monthlyRevenue),
      sub: `${kpis.monthlyCount} réservation${kpis.monthlyCount > 1 ? 's' : ''}`,
      icon: Wallet,
      accent: 'amber',
    },
    { label: 'Taux d\'occupation', value: `${kpis.occupancyRate}%`, sub: 'ce mois', icon: TrendingUp },
    { label: 'Taux d\'annulation', value: `${kpis.cancellationRate}%`, sub: 'ce mois', icon: Percent, accent: kpis.cancellationRate > 20 ? 'red' : 'neutral' },
    { label: 'Blocages actifs', value: String(kpis.activeBlocks), icon: Ban },
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <KpiCard key={it.label} {...it} />
      ))}
    </section>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, accent = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'amber' | 'emerald' | 'red' | 'neutral';
}) {
  const accentMap = {
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-300 bg-red-500/10 border-red-500/20',
    neutral: 'text-neutral-400 bg-white/[0.04] border-white/[0.08]',
  };
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] p-4 sm:p-5 hover:border-white/15 transition">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium leading-tight">{label}</p>
        <span className={cn('inline-flex size-8 items-center justify-center rounded-xl border shrink-0', accentMap[accent])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-bold tabular-nums text-white leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-neutral-600">{sub}</p>}
    </div>
  );
}

/* ─── Alerts ──────────────────────────────────────────────────────── */

function AlertsPanel({ alerts }: { alerts: HotelDashboardResponse['alerts'] }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
        <Info className="size-4 text-amber-400" />
        Alertes & actions à faire
        <span className="text-xs text-neutral-600 font-normal">({alerts.length})</span>
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {alerts.map((a, i) => {
          const styles = a.severity === 'critical'
            ? 'border-red-500/30 bg-red-500/[0.05] text-red-200'
            : a.severity === 'warning'
            ? 'border-amber-500/30 bg-amber-500/[0.05] text-amber-200'
            : 'border-white/10 bg-white/[0.02] text-neutral-300';
          const Icon = a.severity === 'critical' ? AlertTriangle : a.severity === 'warning' ? AlertTriangle : Info;
          const inner = (
            <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition', styles, a.href && 'hover:brightness-110')}>
              <Icon className="size-4 shrink-0 mt-0.5" />
              <span className="flex-1">{a.message}</span>
              {a.href && <ChevronRight className="size-3.5 shrink-0 opacity-60" />}
            </div>
          );
          return (
            <li key={i}>
              {a.href ? <Link href={a.href}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─── Quick links ─────────────────────────────────────────────────── */

function QuickLinks() {
  const links = [
    { href: '/owner/pending', icon: Clock, label: 'Demandes', accent: 'amber' },
    { href: '/owner/availability', icon: CalendarDays, label: 'Calendrier' },
    { href: '/owner/reservations', icon: ClipboardList, label: 'Réservations' },
    { href: '/owner/scanner', icon: QrCode, label: 'Scanner QR' },
    { href: '/owner/my-establishment', icon: Hotel, label: 'Mon hôtel' },
    { href: '/owner/payments', icon: CreditCard, label: 'Paiements' },
  ];
  return (
    <section className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {links.map((l) => {
        const Icon = l.icon;
        const accent = l.accent === 'amber';
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'group flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-xs font-medium transition-all',
              accent
                ? 'border-amber-400/30 bg-amber-400/[0.06] text-amber-300 hover:bg-amber-400/[0.12]'
                : 'border-white/[0.07] bg-[#0C0C0C] text-neutral-300 hover:border-white/15 hover:text-white'
            )}
          >
            <Icon className="size-5" />
            <span className="text-center leading-tight">{l.label}</span>
          </Link>
        );
      })}
    </section>
  );
}

/* ─── today list column ──────────────────────────────────────────── */

function TodayList({
  title, icon: Icon, color, reservations, emptyText, renderAction,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'amber';
  reservations: DashboardReservation[];
  emptyText: string;
  renderAction: (r: DashboardReservation) => React.ReactNode;
}) {
  const colorMap = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  };
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.05]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
          <span className={cn('inline-flex size-7 items-center justify-center rounded-lg border', colorMap[color])}>
            <Icon className="size-3.5" />
          </span>
          {title}
        </h3>
        <span className="text-xs text-neutral-500 tabular-nums">
          {reservations.length} {reservations.length > 1 ? 'séjours' : 'séjour'}
        </span>
      </header>
      {reservations.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-neutral-500">{emptyText}</div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {reservations.map((r) => (
            <li key={r._id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-neutral-100 truncate">{guestName(r)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">
                    {r.reservationCode ?? r._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="size-3" /> {getRoomLabel(r)}
                  </span>
                  {r.partySize && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" /> {r.partySize}
                    </span>
                  )}
                  {color === 'emerald' && r.arrivalTime && (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Clock className="size-3" /> arrivée {r.arrivalTime}
                    </span>
                  )}
                </div>
                {r.remainingAmount && r.remainingAmount > 0 ? (
                  <div className="text-[11px] text-amber-300">
                    Solde dû : <span className="font-semibold tabular-nums">{fmtMoney(r.remainingAmount)}</span>
                  </div>
                ) : null}
              </div>
              <div className="shrink-0">{renderAction(r)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckinButton({ reservation, onDone }: { reservation: DashboardReservation; onDone: () => void }) {
  const done = reservation.checkInStatus === 'checked_in';
  const mut = useMutation({
    mutationFn: () => checkInReservation(reservation._id),
    onSuccess: () => {
      toast.success('Client enregistré');
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });
  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
        <CheckCircle2 className="size-3" /> Enregistré
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={mut.isPending}
      onClick={() => mut.mutate()}
      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black h-8 px-3 text-xs font-bold transition disabled:opacity-50"
    >
      {mut.isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
      Check-in
    </button>
  );
}

function CheckoutButton({ reservation, onDone }: { reservation: DashboardReservation; onDone: () => void }) {
  const done = String(reservation.status).toLowerCase() === 'completed';
  const mut = useMutation({
    mutationFn: () => checkOutReservation(reservation._id),
    onSuccess: () => {
      toast.success('Séjour clôturé');
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });
  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] text-neutral-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
        <CheckCircle2 className="size-3" /> Clôturé
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={mut.isPending}
      onClick={() => mut.mutate()}
      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 text-amber-300 hover:bg-amber-400/10 h-8 px-3 text-xs font-bold transition disabled:opacity-50"
    >
      {mut.isPending ? <Loader2 className="size-3 animate-spin" /> : <LogOut className="size-3" />}
      Check-out
    </button>
  );
}

/* ─── upcoming table ─────────────────────────────────────────────── */

function UpcomingTable({ reservations }: { reservations: DashboardReservation[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.05]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
          <span className="inline-flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
            <CalendarPlus className="size-3.5" />
          </span>
          Arrivées prévues (7 prochains jours)
        </h3>
        <Link href="/owner/reservations" className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1">
          Toutes les réservations <ArrowRight className="size-3" />
        </Link>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-neutral-600 bg-white/[0.02]">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium">Référence</th>
              <th className="text-left px-3 py-2.5 font-medium">Client</th>
              <th className="text-left px-3 py-2.5 font-medium">Chambre</th>
              <th className="text-left px-3 py-2.5 font-medium">Arrivée</th>
              <th className="text-left px-3 py-2.5 font-medium">Nuits</th>
              <th className="text-right px-5 py-2.5 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {reservations.slice(0, 12).map((r) => {
              const nights = Math.max(
                1,
                Math.round((new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 86_400_000)
              );
              return (
                <tr key={r._id} className="hover:bg-white/[0.02] transition">
                  <td className="px-5 py-3 font-mono text-[11px] text-amber-400">
                    {r.reservationCode ?? r._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-3 py-3 text-neutral-200">{guestName(r)}</td>
                  <td className="px-3 py-3 text-neutral-400 text-xs">{getRoomLabel(r)}</td>
                  <td className="px-3 py-3 text-neutral-300 text-xs">{fmtDate(r.startAt)}</td>
                  <td className="px-3 py-3 text-neutral-400 text-xs tabular-nums">{nights}</td>
                  <td className="px-5 py-3 text-right font-semibold text-amber-400 tabular-nums">{fmtMoney(r.totalPrice)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─── skeleton / empty ───────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-80 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
        <div className="h-80 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
      <Icon className="size-12 text-neutral-700 mx-auto mb-3" />
      <p className="text-sm text-neutral-400">{title}</p>
    </div>
  );
}
