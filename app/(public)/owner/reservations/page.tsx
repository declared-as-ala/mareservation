'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Hotel,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Search,
  StickyNote,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import { fetchVenueRooms } from '@/lib/api/rooms';
import {
  fetchOwnerHotelReservations,
  acceptReservation,
  rejectReservation,
  checkInReservation,
  checkOutReservation,
  cancelReservation,
  markNoShow,
  changeReservationDates,
  reassignRoom,
  addReservationNote,
  type OwnerReservation,
} from '@/lib/api/owner-hotel';
import type { HotelRoom } from '@/lib/api/types';

/* ─── status meta ─────────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; tone: 'amber' | 'emerald' | 'red' | 'neutral' | 'blue' }> = {
  pending: { label: 'En attente', tone: 'amber' },
  confirmed: { label: 'Confirmée', tone: 'emerald' },
  checked_in: { label: 'Sur place', tone: 'blue' },
  completed: { label: 'Terminée', tone: 'neutral' },
  cancelled: { label: 'Annulée', tone: 'red' },
  no_show: { label: 'No-show', tone: 'red' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'checked_in', label: 'Sur place' },
  { value: 'completed', label: 'Terminées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'no_show', label: 'No-show' },
];

function statusKey(s: string) {
  return s.toLowerCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}
function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtMoney(n?: number) {
  return `${Math.round(n ?? 0).toLocaleString('fr-FR')} DT`;
}
function getVenueLabel(r: OwnerReservation) {
  return typeof r.venueId === 'object' ? r.venueId?.name : 'Hôtel';
}
function getRoomLabel(r: OwnerReservation) {
  if (typeof r.roomId !== 'object' || !r.roomId) return '—';
  return r.roomId.name ?? `${r.roomId.roomType ?? 'Chambre'} · #${r.roomId.roomNumber ?? '?'}`;
}
function guestName(r: OwnerReservation) {
  return [r.guestFirstName, r.guestLastName].filter(Boolean).join(' ') || 'Client';
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── page ────────────────────────────────────────────────────────── */

export default function OwnerReservationsPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVenueId, setFilterVenueId] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: ownerData } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: fetchOwnerDashboard,
  });

  const { data: reservations = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['owner-hotel-reservations', filterStatus, filterVenueId, filterFrom, filterTo, search],
    queryFn: () =>
      fetchOwnerHotelReservations({
        status: filterStatus,
        venueId: filterVenueId || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        q: search || undefined,
      }),
  });

  const selected = useMemo(
    () => reservations.find((r) => r._id === selectedId) ?? null,
    [reservations, selectedId]
  );

  function refresh() {
    qc.invalidateQueries({ queryKey: ['owner-hotel-reservations'] });
  }

  function clearFilters() {
    setFilterStatus('all');
    setFilterVenueId('');
    setFilterFrom('');
    setFilterTo('');
    setSearch('');
  }

  const hasFilters = filterStatus !== 'all' || !!filterVenueId || !!filterFrom || !!filterTo || !!search;

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      {/* Header */}
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Hôtel</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">Réservations</h1>
          </div>
          <span className="text-xs text-neutral-500 tabular-nums">
            {reservations.length} résultat{reservations.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs font-medium text-neutral-300 hover:text-white hover:border-white/20 transition disabled:opacity-40"
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Rafraîchir
          </button>
        </div>

        {/* Filters */}
        <div className="mx-auto max-w-[1400px] px-4 pb-4 flex flex-wrap items-end gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (ref, client, email, tél)…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 h-9 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
            />
          </div>

          {ownerData?.venues && ownerData.venues.length > 1 && (
            <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-sm">
              <Building2 className="size-3.5 text-neutral-500" />
              <select
                value={filterVenueId}
                onChange={(e) => setFilterVenueId(e.target.value)}
                className="bg-transparent text-neutral-100 focus:outline-none text-xs"
              >
                <option value="" className="bg-[#0C0C0C]">Tous les hôtels</option>
                {ownerData.venues.map((v) => (
                  <option key={v._id} value={v._id} className="bg-[#0C0C0C]">{v.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs text-neutral-400">
            <CalendarDays className="size-3.5" />
            Du
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="bg-transparent text-neutral-100 focus:outline-none text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs text-neutral-400">
            Au
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="bg-transparent text-neutral-100 focus:outline-none text-xs"
            />
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs font-medium text-neutral-500 hover:text-white hover:border-white/20 transition"
            >
              <X className="size-3.5" /> Effacer
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="mx-auto max-w-[1400px] px-4 pb-3 flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterStatus(f.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
                filterStatus === f.value
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                  : 'border-white/[0.08] bg-white/[0.02] text-neutral-500 hover:border-white/15 hover:text-neutral-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        {isLoading ? (
          <div className="text-center py-20 text-neutral-500">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            Chargement…
          </div>
        ) : reservations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-neutral-600 bg-white/[0.02]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Référence</th>
                    <th className="text-left px-3 py-3 font-medium">Client</th>
                    <th className="text-left px-3 py-3 font-medium">Chambre</th>
                    <th className="text-left px-3 py-3 font-medium">Séjour</th>
                    <th className="text-left px-3 py-3 font-medium">Statut</th>
                    <th className="text-left px-3 py-3 font-medium">Paiement</th>
                    <th className="text-right px-3 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {reservations.map((r) => (
                    <Row
                      key={r._id}
                      reservation={r}
                      onSelect={() => setSelectedId(r._id)}
                      onMutated={refresh}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          reservation={selected}
          ownerVenues={ownerData?.venues ?? []}
          onClose={() => setSelectedId(null)}
          onMutated={refresh}
        />
      )}
    </div>
  );
}

/* ─── row ─────────────────────────────────────────────────────────── */

function Row({
  reservation,
  onSelect,
  onMutated,
}: {
  reservation: OwnerReservation;
  onSelect: () => void;
  onMutated: () => void;
}) {
  const status = statusKey(reservation.status);
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  const isPending = status === 'pending';
  const isConfirmed = status === 'confirmed';
  const isCheckedIn = status === 'checked_in';
  const canCancel = ['pending', 'confirmed', 'checked_in'].includes(status);

  return (
    <tr className="hover:bg-white/[0.02] transition">
      <td className="px-4 py-3.5 align-top">
        <div className="font-mono text-[11px] text-amber-400 font-bold">
          {reservation.reservationCode ?? reservation._id.slice(-6).toUpperCase()}
        </div>
        <div className="text-[10px] text-neutral-600 mt-0.5">
          {new Date(reservation.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </div>
        {reservation.source && reservation.source !== 'web' && (
          <span className="mt-1 inline-block rounded-md bg-white/[0.04] border border-white/10 px-1.5 py-0.5 text-[9px] text-neutral-400 uppercase tracking-wider">
            {reservation.source}
          </span>
        )}
      </td>
      <td className="px-3 py-3.5 align-top">
        <div className="text-sm font-medium text-neutral-100 truncate max-w-[180px]">{guestName(reservation)}</div>
        {reservation.customerEmail && (
          <div className="text-[10px] text-neutral-600 truncate max-w-[180px] font-mono">{reservation.customerEmail}</div>
        )}
        {reservation.customerPhone && (
          <div className="text-[10px] text-neutral-500 mt-0.5">{reservation.customerPhone}</div>
        )}
      </td>
      <td className="px-3 py-3.5 align-top text-xs text-neutral-300">
        <div className="flex items-center gap-1">
          <BedDouble className="size-3 text-neutral-500" />
          {getRoomLabel(reservation)}
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-600">{getVenueLabel(reservation)}</div>
      </td>
      <td className="px-3 py-3.5 align-top text-xs">
        <div className="text-neutral-300 whitespace-nowrap">
          {fmtDate(reservation.startAt)} → {fmtDate(reservation.endAt)}
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-600">
          {reservation.nights ?? Math.max(1, Math.round((new Date(reservation.endAt).getTime() - new Date(reservation.startAt).getTime()) / 86_400_000))} nuit{reservation.nights && reservation.nights > 1 ? 's' : ''}
          {reservation.partySize ? ` · ${reservation.partySize} pers.` : ''}
        </div>
      </td>
      <td className="px-3 py-3.5 align-top">
        <StatusBadge meta={meta} />
        {reservation.checkInStatus === 'checked_in' && status !== 'checked_in' && status !== 'completed' && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-300 uppercase tracking-wider">
            <Check className="size-2.5" /> QR vérifié
          </div>
        )}
      </td>
      <td className="px-3 py-3.5 align-top">
        <PaymentBadge status={reservation.paymentStatus} option={reservation.paymentOption} />
        {reservation.remainingAmount && reservation.remainingAmount > 0 ? (
          <div className="mt-1 text-[10px] text-amber-300 tabular-nums">
            Solde {fmtMoney(reservation.remainingAmount)}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3.5 align-top text-right font-semibold text-amber-400 tabular-nums whitespace-nowrap">
        {fmtMoney(reservation.totalPrice)}
      </td>
      <td className="px-4 py-3.5 align-top">
        <div className="flex items-center justify-end gap-1">
          {isPending && (
            <>
              <RowAction
                label="Accepter"
                icon={Check}
                tone="emerald"
                onClick={() => acceptReservation(reservation._id).then(() => { toast.success('Réservation acceptée'); onMutated(); }).catch((e) => toast.error(e.message))}
              />
              <RowAction
                label="Refuser"
                icon={XCircle}
                tone="red"
                onClick={() => {
                  const reason = window.prompt('Motif du refus (facultatif)') || undefined;
                  rejectReservation(reservation._id, reason).then(() => { toast.success('Réservation refusée'); onMutated(); }).catch((e) => toast.error(e.message));
                }}
              />
            </>
          )}
          {isConfirmed && (
            <RowAction
              label="Check-in"
              icon={LogIn}
              tone="emerald"
              onClick={() => checkInReservation(reservation._id).then(() => { toast.success('Client enregistré'); onMutated(); }).catch((e) => toast.error(e.message))}
            />
          )}
          {isCheckedIn && (
            <RowAction
              label="Check-out"
              icon={LogOut}
              tone="amber"
              onClick={() => checkOutReservation(reservation._id).then(() => { toast.success('Séjour clôturé'); onMutated(); }).catch((e) => toast.error(e.message))}
            />
          )}
          {canCancel && (
            <RowAction
              label="Annuler"
              icon={X}
              tone="red"
              ghost
              onClick={() => {
                if (!window.confirm('Annuler cette réservation ?')) return;
                const reason = window.prompt('Motif de l\'annulation (facultatif)') || undefined;
                cancelReservation(reservation._id, reason).then(() => { toast.success('Annulée'); onMutated(); }).catch((e) => toast.error(e.message));
              }}
            />
          )}
          <RowAction label="Détails" icon={Eye} tone="neutral" onClick={onSelect} />
        </div>
      </td>
    </tr>
  );
}

function RowAction({
  label,
  icon: Icon,
  tone,
  ghost,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'emerald' | 'amber' | 'red' | 'neutral';
  ghost?: boolean;
  onClick: () => void;
}) {
  const filled = {
    emerald: 'bg-emerald-500 text-black hover:bg-emerald-400',
    amber: 'bg-amber-400 text-black hover:bg-amber-300',
    red: 'bg-red-500 text-white hover:bg-red-400',
    neutral: 'bg-white/[0.06] text-neutral-200 hover:bg-white/10',
  } as const;
  const ghostCls = {
    emerald: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
    amber: 'border-amber-400/30 text-amber-300 hover:bg-amber-400/10',
    red: 'border-red-500/30 text-red-300 hover:bg-red-500/10',
    neutral: 'border-white/[0.08] text-neutral-400 hover:bg-white/[0.04]',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'inline-flex items-center justify-center size-8 rounded-lg text-xs font-bold transition',
        ghost ? `border ${ghostCls[tone]}` : filled[tone]
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function StatusBadge({ meta }: { meta: { label: string; tone: 'amber' | 'emerald' | 'red' | 'neutral' | 'blue' } }) {
  const tone = {
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
    neutral: 'border-white/15 bg-white/[0.04] text-neutral-400',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  }[meta.tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function PaymentBadge({ status, option }: { status: string; option?: string }) {
  const tone = status === 'paid' ? 'emerald' : status === 'pending' ? 'amber' : status === 'refunded' ? 'neutral' : 'red';
  const label = status === 'paid' ? 'Payé' : status === 'pending' ? 'Acompte' : status === 'refunded' ? 'Remboursé' : status === 'failed' ? 'Échec' : 'Non payé';
  const toneCls = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
    neutral: 'border-white/15 bg-white/[0.04] text-neutral-400',
  }[tone];
  return (
    <div className="space-y-0.5">
      <span className={cn('inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', toneCls)}>
        {label}
      </span>
      {option && <div className="text-[9px] text-neutral-600 uppercase tracking-wider">{option.replace('_', ' ')}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
      <CalendarDays className="size-12 text-neutral-700 mx-auto mb-3" />
      <h2 className="text-base font-semibold text-neutral-200 mb-1">Aucune réservation</h2>
      <p className="text-sm text-neutral-500">Ajustez les filtres ou attendez les premières demandes.</p>
    </div>
  );
}

/* ─── detail drawer ──────────────────────────────────────────────── */

function DetailDrawer({
  reservation,
  ownerVenues,
  onClose,
  onMutated,
}: {
  reservation: OwnerReservation;
  ownerVenues: Array<{ _id: string; name: string }>;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'note' | 'dates' | 'room'>('overview');
  const venueId = typeof reservation.venueId === 'object' ? reservation.venueId?._id : reservation.venueId;
  const currentRoomId = typeof reservation.roomId === 'object' ? reservation.roomId?._id : reservation.roomId;

  // Note state
  const [noteText, setNoteText] = useState('');
  // Dates state
  const [newStart, setNewStart] = useState(reservation.startAt.slice(0, 10));
  const [newEnd, setNewEnd] = useState(reservation.endAt.slice(0, 10));
  // Room state
  const [newRoomId, setNewRoomId] = useState<string>(currentRoomId ?? '');

  const { data: rooms = [] } = useQuery({
    queryKey: ['drawer-rooms', venueId],
    queryFn: () => fetchVenueRooms(venueId!),
    enabled: !!venueId && tab === 'room',
  });

  const noteMut = useMutation({
    mutationFn: () => addReservationNote(reservation._id, noteText),
    onSuccess: () => {
      toast.success('Note ajoutée');
      setNoteText('');
      onMutated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const datesMut = useMutation({
    mutationFn: () =>
      changeReservationDates(
        reservation._id,
        new Date(newStart + 'T00:00:00').toISOString(),
        new Date(newEnd + 'T00:00:00').toISOString()
      ),
    onSuccess: () => {
      toast.success('Dates mises à jour');
      onMutated();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const roomMut = useMutation({
    mutationFn: () => reassignRoom(reservation._id, newRoomId),
    onSuccess: () => {
      toast.success('Chambre changée');
      onMutated();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const noShowMut = useMutation({
    mutationFn: () => markNoShow(reservation._id),
    onSuccess: () => {
      toast.success('Marqué no-show');
      onMutated();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="Fermer" className="flex-1 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-lg h-full overflow-y-auto bg-[#0B0B0B] border-l border-white/[0.07]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur border-b border-white/[0.06] p-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">{getVenueLabel(reservation)}</p>
            <h2 className="font-serif text-lg font-bold text-white truncate">{guestName(reservation)}</h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-amber-400">
                {reservation.reservationCode ?? reservation._id.slice(-8).toUpperCase()}
              </span>
              <StatusBadge meta={STATUS_META[statusKey(reservation.status)] ?? { label: reservation.status, tone: 'neutral' as const }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 grid place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition shrink-0"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Tabs */}
        <nav className="border-b border-white/[0.06] px-5 pt-2 flex gap-1">
          <DrawerTab active={tab === 'overview'} icon={Eye} label="Vue" onClick={() => setTab('overview')} />
          <DrawerTab active={tab === 'note'} icon={StickyNote} label="Notes" onClick={() => setTab('note')} />
          <DrawerTab active={tab === 'dates'} icon={CalendarDays} label="Dates" onClick={() => setTab('dates')} />
          <DrawerTab active={tab === 'room'} icon={BedDouble} label="Chambre" onClick={() => setTab('room')} />
        </nav>

        <div className="p-5 space-y-5">
          {tab === 'overview' && (
            <>
              <Section title="Séjour">
                <DefRow label="Arrivée" value={fmtDateLong(reservation.startAt)} icon={CalendarDays} />
                <DefRow label="Départ" value={fmtDateLong(reservation.endAt)} icon={CalendarDays} />
                <DefRow
                  label="Voyageurs"
                  value={`${reservation.partySize ?? reservation.adults ?? 1}${reservation.children ? ` (dont ${reservation.children} enfants)` : ''}`}
                  icon={Users}
                />
                {reservation.arrivalTime && <DefRow label="Arrivée estimée" value={reservation.arrivalTime} icon={Clock} />}
                <DefRow label="Chambre" value={getRoomLabel(reservation)} icon={BedDouble} />
              </Section>

              <Section title="Client">
                <DefRow label="Nom" value={guestName(reservation)} icon={User} />
                {reservation.customerEmail && (
                  <DefRow label="Email" value={reservation.customerEmail} icon={Mail} mono />
                )}
                {reservation.customerPhone && (
                  <DefRow label="Téléphone" value={reservation.customerPhone} icon={Phone} mono />
                )}
              </Section>

              <Section title="Montants">
                <DefRow label="Total" value={fmtMoney(reservation.totalPrice)} accent />
                <DefRow label="Payé" value={fmtMoney(reservation.amountPaid ?? 0)} />
                <DefRow
                  label="Reste à payer"
                  value={fmtMoney(reservation.remainingAmount ?? 0)}
                  accent={reservation.remainingAmount ? true : false}
                />
              </Section>

              {reservation.notes && (
                <Section title="Notes internes">
                  <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-sans leading-relaxed rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 max-h-48 overflow-y-auto">
                    {reservation.notes}
                  </pre>
                </Section>
              )}

              <Section title="Actions avancées">
                <button
                  type="button"
                  disabled={noShowMut.isPending || ['cancelled', 'completed', 'no_show'].includes(statusKey(reservation.status))}
                  onClick={() => {
                    if (window.confirm('Marquer cette réservation comme no-show ?')) noShowMut.mutate();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-red-500/30 text-red-300 hover:bg-red-500/10 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {noShowMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                  Marquer no-show
                </button>
              </Section>
            </>
          )}

          {tab === 'note' && (
            <Section title="Ajouter une note interne">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 1000))}
                rows={5}
                placeholder="Ex. client VIP, allergie aux noix, demande lit d'appoint…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
              />
              <p className="text-[10px] text-neutral-600 text-right">{noteText.length} / 1000</p>
              <button
                type="button"
                disabled={!noteText.trim() || noteMut.isPending}
                onClick={() => noteMut.mutate()}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-400/20"
              >
                {noteMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}
                Ajouter la note
              </button>
              {reservation.notes && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium mb-2">Notes existantes</p>
                  <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-sans leading-relaxed rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 max-h-64 overflow-y-auto">
                    {reservation.notes}
                  </pre>
                </div>
              )}
            </Section>
          )}

          {tab === 'dates' && (
            <Section title="Modifier les dates du séjour">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Le système vérifiera qu'aucune autre réservation ou blocage ne chevauche la nouvelle plage.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Nouvelle arrivée">
                  <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={drawerInputCls} />
                </DrawerField>
                <DrawerField label="Nouveau départ">
                  <input type="date" value={newEnd} min={newStart} onChange={(e) => setNewEnd(e.target.value)} className={drawerInputCls} />
                </DrawerField>
              </div>
              <button
                type="button"
                disabled={datesMut.isPending || !newStart || !newEnd}
                onClick={() => datesMut.mutate()}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition disabled:opacity-40 shadow-lg shadow-amber-400/20"
              >
                {datesMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
                Mettre à jour les dates
              </button>
            </Section>
          )}

          {tab === 'room' && (
            <Section title="Changer la chambre attribuée">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Sélectionnez une chambre dans le même hôtel. La disponibilité sera vérifiée pour la plage existante.
              </p>
              <DrawerField label="Chambre">
                <select
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  className={drawerInputCls}
                >
                  {rooms.map((r: HotelRoom) => (
                    <option key={r._id} value={r._id} className="bg-[#0C0C0C]">
                      {r.name ?? `Chambre ${r.roomNumber}`} · {r.roomType}
                      {r._id === currentRoomId ? ' (actuelle)' : ''}
                    </option>
                  ))}
                </select>
              </DrawerField>
              <button
                type="button"
                disabled={roomMut.isPending || !newRoomId || newRoomId === currentRoomId}
                onClick={() => roomMut.mutate()}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-400/20"
              >
                {roomMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <BedDouble className="size-4" />}
                Réattribuer la chambre
              </button>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─── drawer atoms ────────────────────────────────────────────────── */

const drawerInputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all';

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-400">{label}</label>
      {children}
    </div>
  );
}

function DrawerTab({
  active, icon: Icon, label, onClick,
}: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition',
        active ? 'border-amber-400 text-amber-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DefRow({
  label, value, icon: Icon, mono, accent,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-neutral-500 flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className={cn('text-right', mono && 'font-mono text-xs', accent ? 'font-bold text-amber-400 tabular-nums' : 'text-neutral-200')}>
        {value}
      </span>
    </div>
  );
}
