'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  ExternalLink,
  Loader2,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  Percent,
  MailCheck,
  MailX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchAdminOwners,
  suspendOwner,
  reactivateOwner,
  updateOwnerCommissionRate,
  verifyOwner,
  unverifyOwner,
  inviteOwner,
  updateOwnerServiceDomains,
  type OwnerUser,
} from '@/lib/api/admin-owners';
import Link from 'next/link';

type StatusFilter = '' | 'active' | 'suspended';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'suspended', label: 'Suspendus' },
];

const SERVICE_DOMAIN_OPTIONS = [
  { key: 'HOTEL', label: 'Hôtel' },
  { key: 'EVENT', label: 'Event' },
  { key: 'COWORKING', label: 'Coworking' },
  { key: 'CAFE_LOUNGE', label: 'Café & Lounge' },
  { key: 'RESTAURANT', label: 'Restaurant' },
  { key: 'CINEMA', label: 'Cinéma' },
  { key: 'EVENT_SPACE', label: 'Salle Event' },
] as const;

function StatusBadge({ owner }: { owner: OwnerUser }) {
  const suspended = owner.isSuspended === true;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        suspended
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      )}
    >
      {suspended ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
      {suspended ? 'Suspendu' : 'Actif'}
    </span>
  );
}

/* ── Suspend Dialog ── */
function SuspendDialog({
  owner,
  onClose,
  onConfirm,
}: {
  owner: OwnerUser;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <ShieldOff className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Suspendre le propriétaire</h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Vous allez suspendre <strong className="text-zinc-200">{owner.fullName}</strong>. Son accès sera désactivé.
        </p>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Raison (optionnel)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Violation des CGU, non-paiement..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none resize-none"
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 rounded-lg bg-red-500/20 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/30"
          >
            Suspendre
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Commission Dialog ── */
function CommissionDialog({
  owner,
  onClose,
  onConfirm,
}: {
  owner: OwnerUser;
  onClose: () => void;
  onConfirm: (rate: number) => void;
}) {
  const [rate, setRate] = useState('');
  const numRate = parseFloat(rate);
  const valid = !isNaN(numRate) && numRate >= 0 && numRate <= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <Percent className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Modifier le taux de commission</h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Nouveau taux pour tous les établissements de <strong className="text-zinc-200">{owner.fullName}</strong>.
        </p>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Taux (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Ex: 10"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800">
            Annuler
          </button>
          <button
            disabled={!valid}
            onClick={() => onConfirm(numRate)}
            className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function AdminOwnersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [suspendTarget, setSuspendTarget] = useState<OwnerUser | null>(null);
  const [commissionTarget, setCommissionTarget] = useState<OwnerUser | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteDomains, setInviteDomains] = useState<string[]>(['EVENT', 'HOTEL']);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-owners', q, status],
    queryFn: () => fetchAdminOwners({ q: q || undefined, status: status || undefined }),
    placeholderData: (prev) => prev,
  });

  const owners = data?.data ?? [];

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => suspendOwner(id, reason),
    onSuccess: () => {
      toast.success('Propriétaire suspendu.');
      setSuspendTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => reactivateOwner(id),
    onSuccess: () => {
      toast.success('Propriétaire réactivé.');
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commissionMut = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) => updateOwnerCommissionRate(id, rate),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Taux mis à jour.');
      setCommissionTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, verify }: { id: string; verify: boolean }) => (verify ? verifyOwner(id) : unverifyOwner(id)),
    onSuccess: (_res, vars) => {
      toast.success(vars.verify ? 'Propriétaire vérifié.' : 'Vérification retirée.');
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inviteMut = useMutation({
    mutationFn: inviteOwner,
    onSuccess: () => {
      toast.success('Invitation envoyee.');
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const domainsMut = useMutation({
    mutationFn: ({ id, serviceDomains }: { id: string; serviceDomains: string[] }) => updateOwnerServiceDomains(id, serviceDomains),
    onSuccess: () => {
      toast.success('Domaines mis à jour.');
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Propriétaires</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gérez les propriétaires d&apos;établissements, leurs statuts et taux de commission.
          </p>
        </div>
        {data?.total != null && (
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
            {data.total} propriétaire{data.total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, email…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
          />
        </div>
        {/* Status pills */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                status === f.key
                  ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="mb-3 text-sm font-semibold text-zinc-200">Inviter un proprietaire</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {[
            { label: 'Hôtel', domains: ['HOTEL'] },
            { label: 'Café', domains: ['CAFE_LOUNGE'] },
            { label: 'Restaurant', domains: ['RESTAURANT'] },
            { label: 'Coworking', domains: ['COWORKING'] },
            { label: 'Événement', domains: ['EVENT', 'EVENT_SPACE'] },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setInviteDomains(preset.domains)}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300 hover:border-amber-400/40 hover:text-amber-300"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nom complet" className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email" className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="Téléphone (optionnel)" className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 md:col-span-1">
            <p className="mb-2 text-xs text-zinc-500">Domaines</p>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_DOMAIN_OPTIONS.map((opt) => {
                const active = inviteDomains.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setInviteDomains((prev) =>
                        prev.includes(opt.key) ? prev.filter((v) => v !== opt.key) : [...prev, opt.key]
                      )
                    }
                    className={cn(
                      'rounded-full border px-2 py-1 text-[11px] font-medium transition',
                      active
                        ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <button
            disabled={inviteMut.isPending || !inviteName.trim() || !inviteEmail.trim() || inviteDomains.length === 0}
            onClick={() =>
              inviteMut.mutate({
                fullName: inviteName,
                email: inviteEmail,
                phone: invitePhone || undefined,
                role: 'ESTABLISHMENT_OWNER',
                serviceDomains: inviteDomains,
              })
            }
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            Inviter
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            Un email sera envoyé au propriétaire pour définir son mot de passe puis accéder à son espace selon les catégories choisies.
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : owners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <UserCheck className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">Aucun propriétaire trouvé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                {['Propriétaire', 'Email', 'Téléphone', 'Établissements', 'Commission', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {owners.map((owner) => (
                <tr key={owner._id} className="group hover:bg-zinc-900/40">
                  {/* Avatar + name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-black shrink-0">
                        {owner.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-zinc-100 truncate max-w-[140px]">{owner.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{owner.email}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{owner.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-zinc-300">{owner.venueCount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">—</td>
                  <td className="px-4 py-3">
                    <StatusBadge owner={owner} />
                    <div className="mt-2 flex max-w-[240px] flex-wrap gap-1">
                      {SERVICE_DOMAIN_OPTIONS.map((opt) => {
                        const active = (owner.serviceDomains ?? []).includes(opt.key);
                        return (
                          <button
                            key={`${owner._id}-${opt.key}`}
                            type="button"
                            disabled={domainsMut.isPending}
                            onClick={() => {
                              const next = active
                                ? (owner.serviceDomains ?? []).filter((v) => v !== opt.key)
                                : [...(owner.serviceDomains ?? []), opt.key];
                              domainsMut.mutate({ id: owner._id, serviceDomains: next });
                            }}
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
                              active
                                ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                                : 'border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/admin/venues?ownerId=${owner._id}`}
                        className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 transition"
                      >
                        <Building2 className="h-3 w-3" />
                        Établissements
                        <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                      </Link>
                      <button
                        onClick={() => setCommissionTarget(owner)}
                        className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-amber-400 hover:bg-amber-400/10 transition"
                      >
                        <Percent className="h-3 w-3" />
                        Commission
                      </button>
                      {owner.isSuspended ? (
                        <button
                          onClick={() => reactivateMut.mutate(owner._id)}
                          disabled={reactivateMut.isPending}
                          className="flex items-center gap-1 rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
                        >
                          <UserCheck className="h-3 w-3" />
                          Réactiver
                        </button>
                      ) : (
                        <button
                          onClick={() => setSuspendTarget(owner)}
                          className="flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
                        >
                          <ShieldOff className="h-3 w-3" />
                          Suspendre
                        </button>
                      )}
                      {owner.emailVerified ? (
                        <button
                          onClick={() => verifyMut.mutate({ id: owner._id, verify: false })}
                          disabled={verifyMut.isPending}
                          className="flex items-center gap-1 rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10 transition disabled:opacity-50"
                        >
                          <MailX className="h-3 w-3" />
                          Dévérifier
                        </button>
                      ) : (
                        <button
                          onClick={() => verifyMut.mutate({ id: owner._id, verify: true })}
                          disabled={verifyMut.isPending}
                          className="flex items-center gap-1 rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-50"
                        >
                          <MailCheck className="h-3 w-3" />
                          Vérifier
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      {suspendTarget && (
        <SuspendDialog
          owner={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onConfirm={(reason) => suspendMut.mutate({ id: suspendTarget._id, reason })}
        />
      )}
      {commissionTarget && (
        <CommissionDialog
          owner={commissionTarget}
          onClose={() => setCommissionTarget(null)}
          onConfirm={(rate) => commissionMut.mutate({ id: commissionTarget._id, rate })}
        />
      )}
    </div>
  );
}
