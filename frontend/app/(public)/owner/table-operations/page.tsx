'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, ClipboardList, Clock3, Plus, Save, ShieldBan } from 'lucide-react';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import {
  checkInOwnerTableReservation,
  checkOutOwnerTableReservation,
  deleteOwnerTableBlock,
  fetchOwnerPreorders,
  fetchOwnerTableBlocks,
  fetchOwnerTablePolicy,
  fetchOwnerTableReservations,
  fetchOwnerVenueMenuItems,
  noShowOwnerTableReservation,
  saveOwnerTablePolicy,
  updateOwnerMenuItem,
  updatePreorderPrepStatus,
} from '@/lib/api/owner-table';
import { fetchOwnerVenueTables } from '@/lib/api/owner-placements';
import { ActiveBlocksList, BlockScheduler, type BlockableUnit } from '@/components/dashboard/BlockScheduler';
import { Button } from '@/components/ui/button';

export default function OwnerTableOperationsPage() {
  const qc = useQueryClient();
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [prepStatus, setPrepStatus] = useState<string>('');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    slotMinutes: 30,
    reservationDurationMinutes: 120,
    openingHour: 12,
    closingHour: 23,
    depositRequired: false,
    depositType: 'none' as 'none' | 'fixed' | 'percent',
    depositValue: 0,
    cancellationCutoffMinutes: 120,
    noShowGraceMinutes: 15,
  });
  const { data: ownerData } = useQuery({ queryKey: ['owner-dashboard'], queryFn: fetchOwnerDashboard });
  const venues = useMemo(
    () => (ownerData?.venues ?? []).filter((v) => ['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(v.type)),
    [ownerData?.venues]
  );
  const venueId = selectedVenueId || venues[0]?._id || '';

  const policyQ = useQuery({
    queryKey: ['owner-table-policy', venueId],
    queryFn: () => fetchOwnerTablePolicy(venueId),
    enabled: !!venueId,
  });
  const reservationsQ = useQuery({
    queryKey: ['owner-table-reservations', venueId, status],
    queryFn: () => fetchOwnerTableReservations({ venueId, status: status || undefined }),
    enabled: !!venueId,
  });
  const blocksQ = useQuery({
    queryKey: ['owner-table-blocks', venueId],
    queryFn: () => fetchOwnerTableBlocks(venueId),
    enabled: !!venueId,
  });
  const tablesQ = useQuery({
    queryKey: ['owner-table-operation-tables', venueId],
    queryFn: () => fetchOwnerVenueTables(venueId),
    enabled: !!venueId,
  });
  const preordersQ = useQuery({
    queryKey: ['owner-table-preorders', venueId, prepStatus],
    queryFn: () => fetchOwnerPreorders({ venueId, prepStatus: prepStatus || undefined }),
    enabled: !!venueId,
  });
  const menuItemsQ = useQuery({
    queryKey: ['owner-table-menu-items', venueId],
    queryFn: () => fetchOwnerVenueMenuItems(venueId),
    enabled: !!venueId,
  });

  const savePolicyMut = useMutation({
    mutationFn: () => saveOwnerTablePolicy(venueId, policyForm),
    onSuccess: () => {
      toast.success('Politique sauvegardee.');
      qc.invalidateQueries({ queryKey: ['owner-table-policy'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });
  const actionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'in' | 'out' | 'no-show' }) => {
      if (action === 'in') return checkInOwnerTableReservation(id);
      if (action === 'out') return checkOutOwnerTableReservation(id);
      return noShowOwnerTableReservation(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-table-reservations'] });
      toast.success('Action appliquee.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const blockDeleteMut = useMutation({
    mutationFn: (id: string) => deleteOwnerTableBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-table-blocks'] });
      toast.success('Blocage retire.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const prepMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' }) =>
      updatePreorderPrepStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-table-preorders'] });
      toast.success('Statut preparation mis a jour.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const menuMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateOwnerMenuItem(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-table-menu-items'] });
      toast.success('Menu mis a jour.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const policy = policyQ.data;
  useEffect(() => {
    if (!policy) return;
    setPolicyForm({
      slotMinutes: Number(policy.slotMinutes ?? 30),
      reservationDurationMinutes: Number(policy.reservationDurationMinutes ?? 120),
      openingHour: Number(policy.openingHour ?? 12),
      closingHour: Number(policy.closingHour ?? 23),
      depositRequired: !!policy.depositRequired,
      depositType: policy.depositType ?? 'none',
      depositValue: Number(policy.depositValue ?? 0),
      cancellationCutoffMinutes: Number(policy.cancellationCutoffMinutes ?? 120),
      noShowGraceMinutes: Number(policy.noShowGraceMinutes ?? 15),
    });
  }, [policy]);

  const reservations = reservationsQ.data ?? [];
  const blocks = blocksQ.data ?? [];
  const tables = tablesQ.data ?? [];
  const preorders = preordersQ.data ?? [];
  const menuItems = menuItemsQ.data ?? [];
  const blockableTables = useMemo<BlockableUnit[]>(
    () =>
      tables.map((table) => ({
        id: table._id,
        label: table.name || (table.tableNumber ? `Table ${table.tableNumber}` : 'Table'),
      })),
    [tables]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400">
            <ArrowLeft className="size-4" /> Espace proprietaire
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Operations Tables</h1>
          <select value={venueId} onChange={(e) => setSelectedVenueId(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            {venues.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-amber-400" /> Politique de reservation</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="space-y-1"><span className="text-zinc-400">Ouverture</span><input className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.openingHour} onChange={(e) => setPolicyForm((p) => ({ ...p, openingHour: Number(e.target.value) }))} /></label>
              <label className="space-y-1"><span className="text-zinc-400">Fermeture</span><input className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.closingHour} onChange={(e) => setPolicyForm((p) => ({ ...p, closingHour: Number(e.target.value) }))} /></label>
              <label className="space-y-1"><span className="text-zinc-400">Slot (min)</span><input className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.slotMinutes} onChange={(e) => setPolicyForm((p) => ({ ...p, slotMinutes: Number(e.target.value) }))} /></label>
              <label className="space-y-1"><span className="text-zinc-400">Duree (min)</span><input className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.reservationDurationMinutes} onChange={(e) => setPolicyForm((p) => ({ ...p, reservationDurationMinutes: Number(e.target.value) }))} /></label>
              <label className="space-y-1"><span className="text-zinc-400">Cutoff annulation</span><input className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.cancellationCutoffMinutes} onChange={(e) => setPolicyForm((p) => ({ ...p, cancellationCutoffMinutes: Number(e.target.value) }))} /></label>
              <label className="space-y-1"><span className="text-zinc-400">Grace no-show</span><input className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.noShowGraceMinutes} onChange={(e) => setPolicyForm((p) => ({ ...p, noShowGraceMinutes: Number(e.target.value) }))} /></label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={policyForm.depositRequired} onChange={(e) => setPolicyForm((p) => ({ ...p, depositRequired: e.target.checked, depositType: e.target.checked ? 'fixed' : 'none' }))} /> Acompte requis</label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <select className="rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" value={policyForm.depositType} onChange={(e) => setPolicyForm((p) => ({ ...p, depositType: e.target.value as 'none' | 'fixed' | 'percent' }))}>
                <option value="none">Aucun</option>
                <option value="fixed">Montant fixe</option>
                <option value="percent">Pourcentage</option>
              </select>
              <input className="rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5" type="number" value={policyForm.depositValue} onChange={(e) => setPolicyForm((p) => ({ ...p, depositValue: Number(e.target.value) }))} />
            </div>
            <button onClick={() => savePolicyMut.mutate()} className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-300"><Save className="size-4" /> Sauvegarder</button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldBan className="size-4 text-amber-400" /> Blocages tables
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Cliquez, choisissez une table, puis 1h / journee / plusieurs jours.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setBlockDialogOpen(true)}
                className="h-11 rounded-xl bg-amber-400 text-black hover:bg-amber-300"
                disabled={!venueId || tablesQ.isLoading}
              >
                <Plus className="mr-1.5 size-4" /> Bloquer une table
              </Button>
            </div>
            <ActiveBlocksList
              blocks={blocks}
              units={blockableTables}
              mode="tables"
              onDelete={(id) => blockDeleteMut.mutate(id)}
              deletingId={blockDeleteMut.variables ?? null}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="size-4 text-amber-400" /> Reservations tables</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
              <option value="">Tous</option>
              <option value="CONFIRMED">Confirmes</option>
              <option value="checked_in">Check-in</option>
              <option value="completed">Terminees</option>
              <option value="no_show">No-show</option>
            </select>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="text-left py-2">Ref</th><th className="text-left py-2">Client</th><th className="text-left py-2">Date</th><th className="text-left py-2">Pers.</th><th className="text-left py-2">Commande</th><th className="text-left py-2">Statut</th><th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r._id} className="border-t border-zinc-800">
                    <td className="py-2">{r.reservationCode ?? r._id.slice(-8)}</td>
                    <td className="py-2">{r.guestFirstName} {r.guestLastName}</td>
                    <td className="py-2">{new Date(r.startAt).toLocaleString('fr-FR')}</td>
                    <td className="py-2">{r.partySize ?? '-'}</td>
                    <td className="py-2 text-xs text-zinc-400">{r.orderType === 'with_menu' ? `Menu ${r.menuTotal ?? 0} TND` : 'Table seule'}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => actionMut.mutate({ id: r._id, action: 'in' })} className="rounded-full border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300">Check-in</button>
                        <button onClick={() => actionMut.mutate({ id: r._id, action: 'out' })} className="rounded-full border border-amber-500/40 px-2 py-1 text-xs text-amber-300">Check-out</button>
                        <button onClick={() => actionMut.mutate({ id: r._id, action: 'no-show' })} className="rounded-full border border-red-500/40 px-2 py-1 text-xs text-red-300">No-show</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="size-4 text-amber-400" /> Precommandes cuisine</div>
            <select value={prepStatus} onChange={(e) => setPrepStatus(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
              <option value="">Tous</option>
              <option value="pending">pending</option>
              <option value="preparing">preparing</option>
              <option value="ready">ready</option>
              <option value="served">served</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          <div className="space-y-2">
            {(preordersQ.data ?? []).map((r) => (
              <div key={r._id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{r.reservationCode ?? r._id.slice(-8)} · {r.guestFirstName} {r.guestLastName}</div>
                  <div className="text-zinc-400">{new Date(r.startAt).toLocaleString('fr-FR')}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">Menu: {r.menuTotal ?? 0} TND · Statut: {r.menuPrepStatus ?? 'pending'}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['pending', 'preparing', 'ready', 'served', 'cancelled'] as const).map((s) => (
                    <button key={s} onClick={() => prepMut.mutate({ id: r._id, status: s })} className="rounded-full border border-zinc-700 px-2 py-1 text-xs hover:border-amber-400/40 hover:text-amber-300">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!(preordersQ.data ?? []).length && <p className="text-sm text-zinc-500">Aucune precommande.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Save className="size-4 text-amber-400" /> Stock & disponibilite menu</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="text-left py-2">Article</th><th className="text-left py-2">Prix</th><th className="text-left py-2">Stock</th><th className="text-left py-2">Fenetre</th><th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((m) => (
                  <tr key={m._id} className="border-t border-zinc-800">
                    <td className="py-2">{m.name}</td>
                    <td className="py-2">{m.price} TND</td>
                    <td className="py-2">{m.trackStock ? (m.stockQty ?? 0) : 'Illimite'}</td>
                    <td className="py-2 text-xs text-zinc-400">{m.availableFrom ?? '--:--'} - {m.availableTo ?? '--:--'}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => menuMut.mutate({ id: m._id, payload: { isAvailable: !m.isAvailable } })} className="rounded-full border border-zinc-700 px-2 py-1 text-xs">{m.isAvailable ? 'Desactiver' : 'Activer'}</button>
                        <button onClick={() => menuMut.mutate({ id: m._id, payload: { trackStock: !m.trackStock } })} className="rounded-full border border-zinc-700 px-2 py-1 text-xs">{m.trackStock ? 'Stock off' : 'Stock on'}</button>
                        {m.trackStock && <button onClick={() => menuMut.mutate({ id: m._id, payload: { stockQty: Math.max(0, (m.stockQty ?? 0) + 10) } })} className="rounded-full border border-zinc-700 px-2 py-1 text-xs">+10</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <CheckCircle2 className="size-3.5 text-emerald-400" /> Ops table cafes/restaurants actives.
        </div>
      </div>
      <BlockScheduler
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        venueId={venueId}
        units={blockableTables}
        mode="tables"
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['owner-table-blocks'] });
          qc.invalidateQueries({ queryKey: ['owner-table-operation-tables'] });
        }}
      />
    </div>
  );
}
