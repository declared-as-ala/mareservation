'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Clock,
  BedDouble,
  User,
  Mail,
  Phone,
  CalendarDays,
  Hotel,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchPendingReservations,
  acceptReservation,
  rejectReservation,
  type PendingReservation,
} from '@/lib/api/owner-hotel';

const SLA_HOURS = 2;

function timeLeft(createdAt: string): { mins: number; label: string; urgent: boolean; expired: boolean } {
  const deadline = new Date(createdAt).getTime() + SLA_HOURS * 60 * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return { mins: 0, label: 'Délai dépassé', urgent: true, expired: true };
  const mins = Math.floor(remaining / 60_000);
  if (mins < 30) return { mins, label: `${mins} min restantes`, urgent: true, expired: false };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { mins, label: `${h}h ${m}min restantes`, urgent: false, expired: false };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function getVenueName(r: PendingReservation) {
  return typeof r.venueId === 'object' ? r.venueId?.name : 'Hôtel';
}
function getRoomLabel(r: PendingReservation) {
  if (typeof r.roomId !== 'object' || !r.roomId) return 'Chambre';
  return r.roomId.name ?? `${r.roomId.roomType ?? 'Chambre'} · #${r.roomId.roomNumber ?? '?'}`;
}

export default function OwnerPendingPage() {
  const qc = useQueryClient();
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['owner-pending'],
    queryFn: fetchPendingReservations,
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      <header className="border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center gap-3">
          <Link
            href="/owner"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-amber-400 hover:border-amber-400/40 transition"
          >
            <ArrowLeft className="size-3.5" />
            Espace propriétaire
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Demandes en attente</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">Demandes de réservation</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 px-3 py-1 text-xs font-semibold">
            <Clock className="size-3.5" />
            {pending.length} en attente
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-neutral-500">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            Chargement…
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
            <Check className="size-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-neutral-200 mb-1">Aucune demande en attente</h2>
            <p className="text-sm text-neutral-500">Toutes les réservations sont à jour.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <PendingCard key={r._id} r={r} onChange={() => qc.invalidateQueries({ queryKey: ['owner-pending'] })} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function PendingCard({ r, onChange }: { r: PendingReservation; onChange: () => void }) {
  const sla = timeLeft(r.createdAt);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const acceptMut = useMutation({
    mutationFn: () => acceptReservation(r._id),
    onSuccess: () => {
      toast.success('Réservation acceptée');
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectReservation(r._id, rejectReason || undefined),
    onSuccess: () => {
      toast.success('Réservation refusée');
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const guest = [r.guestFirstName, r.guestLastName].filter(Boolean).join(' ') || 'Client';
  const venueName = getVenueName(r);

  return (
    <li className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              <Clock className="size-3" />
              En attente
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums',
                sla.expired
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : sla.urgent
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 animate-pulse'
                  : 'border-white/10 bg-white/[0.04] text-neutral-400'
              )}
            >
              {sla.expired && <AlertCircle className="size-3" />}
              {sla.label}
            </span>
            {r.reservationCode && (
              <span className="font-mono text-[11px] text-neutral-500">{r.reservationCode}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-neutral-200 font-semibold">
              <Hotel className="size-4 text-amber-400" />
              {venueName}
            </span>
            <span className="inline-flex items-center gap-1.5 text-neutral-400">
              <BedDouble className="size-4 text-neutral-500" />
              {getRoomLabel(r)}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail icon={User} label="Client" value={guest} />
            {r.customerEmail && <Detail icon={Mail} label="Email" value={r.customerEmail} mono />}
            {r.customerPhone && <Detail icon={Phone} label="Téléphone" value={r.customerPhone} mono />}
            <Detail
              icon={CalendarDays}
              label="Séjour"
              value={`${fmtDate(r.startAt)} → ${fmtDate(r.endAt)}`}
            />
          </dl>

          <div className="text-sm">
            <span className="text-neutral-500">Total annoncé : </span>
            <span className="font-semibold text-amber-400 tabular-nums">{Math.round(r.totalPrice).toLocaleString('fr-FR')} DT</span>
            {r.paymentOption && <span className="ml-2 text-[11px] text-neutral-500">· {r.paymentOption}</span>}
          </div>
        </div>

        <div className="flex lg:flex-col gap-2 lg:w-44">
          <button
            type="button"
            disabled={acceptMut.isPending || rejectMut.isPending}
            onClick={() => acceptMut.mutate()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black h-10 px-4 text-sm font-bold transition disabled:opacity-50"
          >
            {acceptMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Accepter
          </button>
          <button
            type="button"
            disabled={acceptMut.isPending || rejectMut.isPending}
            onClick={() => setRejecting((v) => !v)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-300 hover:bg-red-500/10 h-10 px-4 text-sm font-semibold transition disabled:opacity-50"
          >
            <X className="size-4" />
            Refuser
          </button>
        </div>
      </div>

      {rejecting && (
        <div className="border-t border-white/[0.06] p-5 bg-red-500/[0.03] space-y-3">
          <label className="block text-xs font-medium text-neutral-400">Motif du refus (facultatif)</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex. chambre indisponible, problème technique…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-red-400/40 focus:outline-none focus:ring-1 focus:ring-red-400/20"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="h-9 px-4 rounded-xl border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition disabled:opacity-50"
            >
              {rejectMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              Confirmer le refus
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({
  icon: Icon, label, value, mono,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-3.5 text-neutral-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">{label}</dt>
        <dd className={cn('text-sm text-neutral-200 truncate', mono && 'font-mono text-xs')}>{value}</dd>
      </div>
    </div>
  );
}
