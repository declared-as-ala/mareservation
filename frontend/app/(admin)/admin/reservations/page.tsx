'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchAdminReservations,
  forceCancelAdminReservation,
  markAdminReservationRefunded,
  addAdminReservationNote,
  checkoutReservation,
  markCheckedIn,
} from '@/lib/api/admin';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar, Clock, FileText, RotateCcw, ShieldAlert,
  Users, LogOut, LogIn, Search, Filter, ChevronDown,
  CheckCircle2, XCircle, AlertCircle, Timer, Ban,
} from 'lucide-react';

type AdminReservationRow = {
  _id: string;
  confirmationCode?: string;
  reservationCode?: string;
  bookingType?: string;
  venueId?: { name?: string };
  tableId?: { tableNumber?: number; name?: string };
  startAt?: string;
  endAt?: string;
  status?: string;
  paymentStatus?: string;
  totalPrice?: number;
  partySize?: number;
  customerFirstName?: string;
  customerLastName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  userId?: { fullName?: string; email?: string };
  internalNotes?: string[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed:  { label: 'Confirmée',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', icon: CheckCircle2 },
  pending:    { label: 'En attente',  color: 'bg-amber-500/10  text-amber-400  border-amber-500/25',   icon: Timer },
  completed:  { label: 'Terminée',    color: 'bg-blue-500/10   text-blue-400   border-blue-500/25',    icon: CheckCircle2 },
  checked_in: { label: 'Arrivé',      color: 'bg-cyan-500/10   text-cyan-400   border-cyan-500/25',    icon: LogIn },
  cancelled:  { label: 'Annulée',     color: 'bg-red-500/10    text-red-400    border-red-500/25',     icon: XCircle },
  no_show:    { label: 'Absent',      color: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: AlertCircle },
};

function StatusBadge({ status }: { status?: string }) {
  const key = String(status ?? '').toLowerCase();
  const cfg = STATUS_CONFIG[key];
  const Icon = cfg?.icon ?? AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg?.color ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      <Icon className="size-3 shrink-0" />
      {cfg?.label ?? status ?? '—'}
    </span>
  );
}

function PaymentBadge({ paymentStatus }: { paymentStatus?: string }) {
  const key = String(paymentStatus ?? '').toLowerCase();
  const styles: Record<string, string> = {
    paid:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    pending:  'bg-amber-500/10  text-amber-400  border-amber-500/25',
    unpaid:   'bg-zinc-700/50   text-zinc-300   border-zinc-600',
    failed:   'bg-red-500/10    text-red-400    border-red-500/25',
    refunded: 'bg-blue-500/10   text-blue-400   border-blue-500/25',
  };
  const labels: Record<string, string> = {
    paid: 'Payé', pending: 'En attente', unpaid: 'Non payé', failed: 'Échoué', refunded: 'Remboursé',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[key] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      {labels[key] ?? paymentStatus ?? '—'}
    </span>
  );
}

function guestLabel(row: AdminReservationRow) {
  const fullName = [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const guest = [row.guestFirstName, row.guestLastName].filter(Boolean).join(' ').trim();
  if (guest) return guest;
  return row.userId?.fullName ?? row.userId?.email ?? '—';
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUSES = ['all', 'confirmed', 'pending', 'checked_in', 'completed', 'cancelled', 'no_show'];

export default function AdminReservationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['admin', 'reservations'],
    queryFn: () => fetchAdminReservations(),
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const list = useMemo(() => {
    let rows = (reservations as AdminReservationRow[])
      .slice()
      .sort((a, b) => Number(new Date(b.startAt ?? 0)) - Number(new Date(a.startAt ?? 0)));
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => String(r.status ?? '').toLowerCase() === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        guestLabel(r).toLowerCase().includes(q) ||
        (r.confirmationCode ?? r.reservationCode ?? '').toLowerCase().includes(q) ||
        (typeof r.venueId === 'object' ? r.venueId?.name ?? '' : '').toLowerCase().includes(q) ||
        (r.guestPhone ?? '').includes(q)
      );
    }
    return rows;
  }, [reservations, statusFilter, search]);

  const counts = useMemo(() => {
    const all = reservations as AdminReservationRow[];
    return {
      total: all.length,
      confirmed: all.filter((r) => String(r.status ?? '').toLowerCase() === 'confirmed').length,
      pending: all.filter((r) => String(r.status ?? '').toLowerCase() === 'pending').length,
      checked_in: all.filter((r) => String(r.status ?? '').toLowerCase() === 'checked_in').length,
    };
  }, [reservations]);

  function mutOpts(msg: string) {
    return {
      onSuccess: () => { toast.success(msg); qc.invalidateQueries({ queryKey: ['admin', 'reservations'] }); },
      onError: (e: Error) => toast.error(e.message),
    };
  }

  const forceCancelMut  = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => forceCancelAdminReservation(id, reason), ...mutOpts('Réservation annulée.') });
  const markRefundedMut = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => markAdminReservationRefunded(id, reason), ...mutOpts('Remboursement enregistré.') });
  const noteMut         = useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => addAdminReservationNote(id, note), ...mutOpts('Note ajoutée.') });
  const checkoutMut     = useMutation({ mutationFn: (id: string) => checkoutReservation(id), ...mutOpts('Table libérée ✓') });
  const checkInMut      = useMutation({ mutationFn: (id: string) => markCheckedIn(id), ...mutOpts('Client enregistré à l\'arrivée.') });

  function onCheckout(row: AdminReservationRow) {
    if (!window.confirm(`Confirmer que ${guestLabel(row)} est parti(e) et libérer la table ?`)) return;
    checkoutMut.mutate(row._id);
  }
  function onCheckIn(row: AdminReservationRow) {
    if (!window.confirm(`Confirmer l'arrivée de ${guestLabel(row)} ?`)) return;
    checkInMut.mutate(row._id);
  }
  function onForceCancel(row: AdminReservationRow) {
    const reason = window.prompt('Motif obligatoire pour annuler')?.trim() ?? '';
    if (!reason) return toast.error('Motif requis.');
    forceCancelMut.mutate({ id: row._id, reason });
  }
  function onMarkRefunded(row: AdminReservationRow) {
    const reason = window.prompt('Motif du remboursement')?.trim() ?? '';
    if (!reason) return toast.error('Motif requis.');
    markRefundedMut.mutate({ id: row._id, reason });
  }
  function onAddNote(row: AdminReservationRow) {
    const note = window.prompt('Note admin (max 2000 car.)')?.trim() ?? '';
    if (!note) return toast.error('Note requise.');
    noteMut.mutate({ id: row._id, note });
  }

  const canCheckout = (r: AdminReservationRow) => ['confirmed', 'checked_in'].includes(String(r.status ?? '').toLowerCase());
  const canCheckin  = (r: AdminReservationRow) => ['confirmed', 'pending'].includes(String(r.status ?? '').toLowerCase());
  const canCancel   = (r: AdminReservationRow) => !['cancelled', 'completed'].includes(String(r.status ?? '').toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Réservations</h1>
          <p className="mt-1 text-sm text-zinc-400">{counts.total} réservation{counts.total !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Confirmées', value: counts.confirmed, color: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/5' },
          { label: 'En attente', value: counts.pending,   color: 'text-amber-400',   bg: 'border-amber-500/20  bg-amber-500/5'  },
          { label: 'Arrivées',   value: counts.checked_in,color: 'text-cyan-400',    bg: 'border-cyan-500/20   bg-cyan-500/5'   },
          { label: 'Total',      value: counts.total,     color: 'text-zinc-100',    bg: 'border-zinc-700      bg-zinc-900/60'  },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{k.label}</p>
            <p className={`mt-1 text-3xl font-black tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher client, code, lieu, tél…"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-9 py-2.5 text-sm text-zinc-200 focus:border-amber-400/50 focus:outline-none cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Tous les statuts' : (STATUS_CONFIG[s]?.label ?? s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <Skeleton className="h-5 w-48 bg-zinc-800 mb-3" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-32 bg-zinc-800" />
                <Skeleton className="h-4 w-24 bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-20 text-zinc-500">
          <ShieldAlert className="size-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Aucune réservation trouvée</p>
          <p className="text-xs mt-1 text-zinc-600">Essayez de modifier vos filtres</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const status = String(r.status ?? '').toLowerCase();
            const isTable = r.bookingType === 'TABLE' || !!r.tableId;
            const tableName = typeof r.tableId === 'object'
              ? (r.tableId?.name || `Table ${r.tableId?.tableNumber ?? ''}`)
              : null;
            return (
              <div
                key={r._id}
                className={`group rounded-2xl border bg-zinc-900/50 p-5 transition-all hover:bg-zinc-900 ${
                  status === 'checked_in' ? 'border-cyan-500/25' :
                  status === 'confirmed'  ? 'border-emerald-500/20' :
                  status === 'cancelled'  ? 'border-red-500/15' :
                  status === 'completed'  ? 'border-blue-500/20' :
                  'border-zinc-800'
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  {/* Left info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                        {r.reservationCode ?? r.confirmationCode ?? r._id.slice(-8).toUpperCase()}
                      </code>
                      <StatusBadge status={r.status} />
                      <PaymentBadge paymentStatus={r.paymentStatus} />
                      {isTable && tableName && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
                          🪑 {tableName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-zinc-200">{guestLabel(r)}</span>
                      {r.guestPhone && <span className="text-zinc-500 text-xs">{r.guestPhone}</span>}
                      {typeof r.venueId === 'object' && r.venueId?.name && (
                        <span className="text-zinc-400 text-xs font-medium">{r.venueId.name}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-zinc-600" />
                        {fmtDate(r.startAt)}
                      </span>
                      {r.partySize != null && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 text-zinc-600" />
                          {r.partySize} pers.
                        </span>
                      )}
                      {typeof r.totalPrice === 'number' && r.totalPrice > 0 && (
                        <span className="font-semibold text-amber-400">{r.totalPrice.toFixed(2)} DT</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* ✅ Libérer la table — primary owner action */}
                    {canCheckout(r) && (
                      <button
                        type="button"
                        onClick={() => onCheckout(r)}
                        disabled={checkoutMut.isPending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/60 disabled:opacity-50"
                      >
                        <LogOut className="size-3.5" />
                        Libérer la table
                      </button>
                    )}

                    {/* Check-in */}
                    {canCheckin(r) && (
                      <button
                        type="button"
                        onClick={() => onCheckIn(r)}
                        disabled={checkInMut.isPending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/8 px-3 text-xs font-bold text-cyan-300 transition-all hover:bg-cyan-500/15 disabled:opacity-50"
                      >
                        <LogIn className="size-3.5" />
                        Arrivée
                      </button>
                    )}

                    {/* Cancel */}
                    {canCancel(r) && (
                      <button
                        type="button"
                        onClick={() => onForceCancel(r)}
                        disabled={forceCancelMut.isPending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/5 px-3 text-xs font-bold text-red-400 transition-all hover:bg-red-500/15 disabled:opacity-50"
                      >
                        <Ban className="size-3.5" />
                        Annuler
                      </button>
                    )}

                    {/* Refund */}
                    <button
                      type="button"
                      onClick={() => onMarkRefunded(r)}
                      disabled={markRefundedMut.isPending}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/10 disabled:opacity-50"
                    >
                      <RotateCcw className="size-3.5" />
                      Rembourser
                    </button>

                    {/* Note */}
                    <button
                      type="button"
                      onClick={() => onAddNote(r)}
                      disabled={noteMut.isPending}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 text-xs font-semibold text-zinc-400 transition-all hover:bg-zinc-700/60 disabled:opacity-50"
                    >
                      <FileText className="size-3.5" />
                      Note
                    </button>
                  </div>
                </div>

                {/* Notes preview */}
                {r.internalNotes && r.internalNotes.length > 0 && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    {r.internalNotes.slice(-2).map((note, i) => (
                      <p key={i} className="text-[11px] text-zinc-500 leading-5">
                        <span className="text-zinc-600 mr-1">📝</span>{note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
