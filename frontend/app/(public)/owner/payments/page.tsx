'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDownRight,
  BadgeCheck,
  BanknoteIcon,
  Building2,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { printPayout } from '@/lib/utils/payoutPrint';
import { cn } from '@/lib/utils';
import {
  fetchOwnerBalance,
  fetchOwnerPayouts,
  type Payout,
  type PayoutStatus,
} from '@/lib/api/payouts';

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'En attente',  color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',   icon: Clock },
  approved: { label: 'Approuvé',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',     icon: BadgeCheck },
  paid:     { label: 'Payé',        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: BanknoteIcon },
  on_hold:  { label: 'Suspendu',    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: AlertCircle },
  rejected: { label: 'Rejeté',      color: 'text-red-400 bg-red-400/10 border-red-400/20',         icon: XCircle },
};

function StatusBadge({ status }: { status: PayoutStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0 }).format(Math.round(n));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PayoutRow({ payout, onClick }: { payout: Payout; onClick: () => void }) {
  const venue = typeof payout.venueId === 'object' ? payout.venueId : null;
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
        <Receipt className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {venue?.name ?? 'Établissement'}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {fmtDate(payout.periodStart)} → {fmtDate(payout.periodEnd)} · {payout.items.length} rés.
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-emerald-400">{fmt(payout.net)} TND</p>
        <p className="mt-0.5 text-xs text-zinc-500">net</p>
      </div>
      <StatusBadge status={payout.status} />
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600 transition group-hover:text-zinc-400" />
    </button>
  );
}

function PayoutDetailModal({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const venue = typeof payout.venueId === 'object' ? payout.venueId : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{venue?.name ?? 'Virement'}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {fmtDate(payout.periodStart)} → {fmtDate(payout.periodEnd)}
            </p>
          </div>
          <StatusBadge status={payout.status} />
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Brut', value: payout.gross, color: 'text-zinc-100' },
            { label: 'Commission', value: payout.commission, color: 'text-red-400' },
            { label: 'Net', value: payout.net, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-center">
              <p className={cn('text-base font-bold', color)}>{fmt(value)}</p>
              <p className="text-xs text-zinc-500">{label} TND</p>
            </div>
          ))}
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Réservations incluses ({payout.items.length})
        </p>
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {payout.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2 text-xs">
              <div>
                <span className="font-mono font-medium text-zinc-200">{item.reservationCode ?? '—'}</span>
                <span className="ml-2 text-zinc-500">
                  {fmtDate(item.startAt)} → {fmtDate(item.endAt)}
                </span>
              </div>
              <span className="font-medium text-emerald-400">{fmt(item.net)} TND</span>
            </div>
          ))}
        </div>

        {payout.status === 'paid' && payout.paidAt && (
          <p className="mt-4 text-xs text-zinc-500">
            Payé le {fmtDate(payout.paidAt)}
            {payout.paymentReference && <span className="ml-1">· Réf: {payout.paymentReference}</span>}
          </p>
        )}
        {payout.statusReason && (
          <p className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
            {payout.statusReason}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => printPayout(payout)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-400/10 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-400/20"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvés' },
  { key: 'paid', label: 'Payés' },
  { key: 'on_hold', label: 'Suspendus' },
];

export default function OwnerPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['owner-balance'],
    queryFn: fetchOwnerBalance,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['owner-payouts', statusFilter],
    queryFn: () => fetchOwnerPayouts({ status: statusFilter || undefined }),
  });

  const payouts = payoutsData?.data ?? [];
  const totalPaid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.net, 0);
  const totalPending = payouts.filter((p) => ['pending', 'approved'].includes(p.status)).reduce((s, p) => s + p.net, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Mes virements</h1>
        <p className="mt-1 text-sm text-zinc-400">Suivez vos commissions nettes et l&apos;historique de vos paiements.</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Solde non versé</p>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          {balanceLoading ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-zinc-500" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-emerald-400">{fmt(balance?.totalUnpaid ?? 0)} TND</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">En cours</p>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-400">{fmt(totalPending)} TND</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Versé (historique)</p>
            <CircleDollarSign className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-200">{fmt(totalPaid)} TND</p>
        </div>
      </div>

      {/* Balance breakdown by venue */}
      {(balance?.venues ?? []).length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Solde par établissement</p>
          <div className="space-y-2">
            {balance!.venues.map((v) => (
              <div key={v._id} className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-200">{v.venueName}</span>
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                    {v.reservationCount} rés.
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-emerald-400">{fmt(v.net)} TND</span>
                  <span className="ml-2 text-xs text-zinc-500">net</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              statusFilter === f.key
                ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Payout list */}
      {payoutsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
          <Receipt className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">Aucun virement pour cette période.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <PayoutRow key={p._id} payout={p} onClick={() => setSelectedPayout(p)} />
          ))}
        </div>
      )}

      {selectedPayout && (
        <PayoutDetailModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} />
      )}
    </div>
  );
}
