'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  BadgeCheck,
  BanknoteIcon,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import { printPayout } from '@/lib/utils/payoutPrint';
import { cn } from '@/lib/utils';
import {
  fetchAdminPayouts,
  fetchAdminPayoutDetail,
  adminGeneratePayout,
  adminApprovePayout,
  adminMarkPayoutPaid,
  adminHoldPayout,
  adminRejectPayout,
  type Payout,
  type PayoutStatus,
} from '@/lib/api/payouts';
import { fetchAdminVenues } from '@/lib/api/admin';

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'En attente',  color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',      icon: Clock },
  approved: { label: 'Approuvé',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',         icon: BadgeCheck },
  paid:     { label: 'Payé',        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: BanknoteIcon },
  on_hold:  { label: 'Suspendu',    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',    icon: AlertCircle },
  rejected: { label: 'Rejeté',      color: 'text-red-400 bg-red-400/10 border-red-400/20',             icon: XCircle },
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

/* ── Generate Payout Dialog ──────────────────────────────────────── */
function GenerateDialog({
  venues,
  onClose,
  onGenerate,
}: {
  venues: { _id: string; name: string }[];
  onClose: () => void;
  onGenerate: (payload: { venueId: string; periodStart: string; periodEnd: string }) => void;
}) {
  const [venueId, setVenueId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Générer un virement</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Établissement</label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="">Choisir un établissement…</option>
              {venues.map((v) => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Début de période</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Fin de période</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800">
            Annuler
          </button>
          <button
            disabled={!venueId || !periodStart || !periodEnd}
            onClick={() => onGenerate({ venueId, periodStart, periodEnd })}
            className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
          >
            Générer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail / Actions Panel ──────────────────────────────────────── */
function PayoutDetailPanel({
  payout,
  onClose,
  onAction,
}: {
  payout: Payout;
  onClose: () => void;
  onAction: (action: string, payload?: Record<string, string>) => void;
}) {
  const [refInput, setRefInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const venue = typeof payout.venueId === 'object' ? payout.venueId : null;
  const owner = typeof payout.ownerId === 'object' ? payout.ownerId : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{venue?.name ?? 'Virement'}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {owner?.name ?? '—'} · {owner?.email ?? '—'}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {fmtDate(payout.periodStart)} → {fmtDate(payout.periodEnd)}
            </p>
          </div>
          <StatusBadge status={payout.status} />
        </div>

        {/* Totals */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Brut', value: payout.gross, color: 'text-zinc-100' },
            { label: 'Commission', value: payout.commission, color: 'text-red-400' },
            { label: 'Net propriétaire', value: payout.net, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-center">
              <p className={cn('text-sm font-bold', color)}>{fmt(value)}</p>
              <p className="text-xs text-zinc-600">{label} TND</p>
            </div>
          ))}
        </div>

        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Réservations ({payout.items.length})
        </p>
        <div className="mb-4 max-h-40 space-y-1 overflow-y-auto pr-1">
          {payout.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-zinc-900 px-2.5 py-1.5 text-xs">
              <span className="font-mono text-zinc-300">{item.reservationCode ?? item.reservationId?.toString().slice(-6)}</span>
              <span className="text-zinc-500">{fmtDate(item.startAt)} → {fmtDate(item.endAt)}</span>
              <span className="text-emerald-400">{fmt(item.net)} TND</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {payout.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => onAction('approve')}
              className="flex-1 rounded-lg bg-blue-500/20 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/30">
              Approuver
            </button>
            <button onClick={() => onAction('hold', { reason: reasonInput })}
              className="flex-1 rounded-lg bg-orange-500/10 py-2 text-sm text-orange-300 hover:bg-orange-500/20">
              Suspendre
            </button>
            <button onClick={() => onAction('reject', { reason: reasonInput })}
              className="flex-1 rounded-lg bg-red-500/10 py-2 text-sm text-red-300 hover:bg-red-500/20">
              Rejeter
            </button>
          </div>
        )}

        {payout.status === 'approved' && (
          <div className="space-y-2">
            <input
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="Référence de paiement (optionnel)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
            />
            <button onClick={() => onAction('mark-paid', { paymentReference: refInput })}
              className="w-full rounded-lg bg-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30">
              Marquer comme payé
            </button>
          </div>
        )}

        {['on_hold', 'rejected'].includes(payout.status) && payout.statusReason && (
          <p className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
            {payout.statusReason}
          </p>
        )}

        {payout.status === 'paid' && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-300">
            Payé le {payout.paidAt ? fmtDate(payout.paidAt) : '—'}
            {payout.paymentReference && <span className="ml-1 text-xs text-emerald-400/70">· {payout.paymentReference}</span>}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const owner = typeof payout.ownerId === 'object' ? payout.ownerId : null;
              printPayout(payout, owner?.name);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-400/10 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/20"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:bg-zinc-800">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
const STATUS_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvés' },
  { key: 'paid', label: 'Payés' },
  { key: 'on_hold', label: 'Suspendus' },
  { key: 'rejected', label: 'Rejetés' },
];

export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  const { data: payoutsData, isLoading } = useQuery({
    queryKey: ['admin-payouts', statusFilter],
    queryFn: () => fetchAdminPayouts({ status: statusFilter || undefined }),
  });

  const { data: venuesData } = useQuery({
    queryKey: ['admin-venues-list'],
    queryFn: () => fetchAdminVenues({ limit: 200 }),
    staleTime: 60_000,
  });

  const venues = Array.isArray(venuesData) ? (venuesData as { _id: string; name: string }[]) : [];
  const payouts = payoutsData?.data ?? [];

  const generateMut = useMutation({
    mutationFn: adminGeneratePayout,
    onSuccess: () => { toast.success('Virement généré.'); setShowGenerate(false); qc.invalidateQueries({ queryKey: ['admin-payouts'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const actionMut = useMutation({
    mutationFn: async ({ action, id, payload }: { action: string; id: string; payload?: Record<string, string> }) => {
      if (action === 'approve') return adminApprovePayout(id);
      if (action === 'mark-paid') return adminMarkPayoutPaid(id, payload);
      if (action === 'hold') return adminHoldPayout(id, payload?.reason);
      if (action === 'reject') return adminRejectPayout(id, payload?.reason);
    },
    onSuccess: (updated) => {
      toast.success('Virement mis à jour.');
      setSelectedPayout(updated as Payout ?? null);
      qc.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = {
    pending: payouts.filter((p) => p.status === 'pending').length,
    approved: payouts.filter((p) => p.status === 'approved').length,
    totalNet: payouts.filter((p) => p.status !== 'rejected').reduce((s, p) => s + p.net, 0),
    commission: payouts.reduce((s, p) => s + p.commission, 0),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Virements propriétaires</h1>
          <p className="mt-1 text-sm text-zinc-400">Gérez les versements des commissions nettes aux propriétaires.</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Générer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-amber-400' },
          { label: 'Approuvés', value: stats.approved, icon: BadgeCheck, color: 'text-blue-400' },
          { label: 'Net total (liste)', value: `${fmt(stats.totalNet)} TND`, icon: CircleDollarSign, color: 'text-emerald-400' },
          { label: 'Commission (liste)', value: `${fmt(stats.commission)} TND`, icon: Receipt, color: 'text-zinc-300' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
            <p className={cn('mt-1 text-xl font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
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

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
          <Receipt className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">Aucun virement.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                {['Établissement', 'Propriétaire', 'Période', 'Brut', 'Commission', 'Net', 'Statut', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {payouts.map((p) => {
                const venue = typeof p.venueId === 'object' ? p.venueId : null;
                const owner = typeof p.ownerId === 'object' ? p.ownerId : null;
                return (
                  <tr key={p._id} className="group hover:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-100">{venue?.name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{owner?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{fmt(p.gross)}</td>
                    <td className="px-4 py-3 text-red-400">{fmt(p.commission)}</td>
                    <td className="px-4 py-3 font-medium text-emerald-400">{fmt(p.net)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedPayout(p)}
                        className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showGenerate && (
        <GenerateDialog
          venues={venues}
          onClose={() => setShowGenerate(false)}
          onGenerate={(payload) => generateMut.mutate(payload)}
        />
      )}

      {selectedPayout && (
        <PayoutDetailPanel
          payout={selectedPayout}
          onClose={() => setSelectedPayout(null)}
          onAction={(action, payload) =>
            actionMut.mutate({ action, id: selectedPayout._id, payload })
          }
        />
      )}
    </div>
  );
}
