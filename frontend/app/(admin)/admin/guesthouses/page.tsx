'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ExternalLink, Home, Plus, Search, View } from 'lucide-react';
import { createGuesthouse, fetchGuesthouses, fetchOwners, type GuesthouseRow } from '@/lib/api/admin-console';
import { GOVERNORATES } from '@/lib/api/bookings';
import {
  Card, Drawer, EmptyState, ErrorBox, PageHeader, PUBLIC_STATE, Skeleton, Spinner, StatusBadge, button, fmtDay, fmtTND, inputCls, labelCls, selectCls, td, th,
} from '@/components/admin/console/ui';
import { cn } from '@/lib/utils';

const TOUR: Record<string, string> = { external: 'Spinview', scenes: 'Multi-scènes', none: 'Aucune' };

function GuesthousesInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [state, setState] = useState(sp.get('filter') === 'bookable' ? 'published' : '');
  const [tour, setTour] = useState('');
  const [mode, setMode] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-guesthouses'], queryFn: fetchGuesthouses });
  const owners = useQuery({ queryKey: ['admin-owners'], queryFn: fetchOwners, staleTime: 300_000 });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((g) =>
      (!s || [g.name, g.city, g.governorate, g.owner?.name, g.owner?.email].some((x) => x?.toLowerCase().includes(s))) &&
      (!state || g.publicState === state) &&
      (!tour || (tour === 'with' ? g.tour !== 'none' : g.tour === 'none')) &&
      (!mode || g.bookingMode === mode) &&
      (!ownerId || (ownerId === 'none' ? !g.owner : g.owner?.id === ownerId)) &&
      (!incomplete || g.missing.length > 0)
    );
  }, [data, q, state, tour, mode, ownerId, incomplete]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Établissements"
        subtitle={data ? `${data.length} maison${data.length > 1 ? 's' : ''} d’hôtes · ${data.filter((g) => g.publicState === 'published').length} publiée${data.filter((g) => g.publicState === 'published').length > 1 ? 's' : ''}` : 'Maisons d’hôtes'}
        actions={<button type="button" className={button('primary')} onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Créer une maison d’hôtes</button>}
      />

      <Card bodyClassName="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="g-q" className={labelCls}>Recherche</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9A968D]" aria-hidden="true" />
              <input id="g-q" type="search" className={cn(inputCls, 'pl-8')} placeholder="Nom, ville, propriétaire" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="g-state" className={labelCls}>Publication</label>
            <select id="g-state" className={selectCls} value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Toutes</option><option value="published">Publiées</option><option value="draft">Brouillons</option><option value="pending_review">En revue</option><option value="suspended">Suspendues</option>
            </select>
          </div>
          <div>
            <label htmlFor="g-tour" className={labelCls}>Visite 360°</label>
            <select id="g-tour" className={selectCls} value={tour} onChange={(e) => setTour(e.target.value)}>
              <option value="">Toutes</option><option value="with">Avec visite</option><option value="without">Sans visite</option>
            </select>
          </div>
          <div>
            <label htmlFor="g-mode" className={labelCls}>Réservation</label>
            <select id="g-mode" className={selectCls} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">Tous modes</option><option value="instant">Instantanée</option><option value="request">Validation propriétaire</option>
            </select>
          </div>
          <div>
            <label htmlFor="g-owner" className={labelCls}>Propriétaire</label>
            <select id="g-owner" className={selectCls} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Tous</option><option value="none">Sans propriétaire</option>
              {(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-[#4A4740]">
            <input type="checkbox" className="size-4 accent-[#C99628]" checked={incomplete} onChange={(e) => setIncomplete(e.target.checked)} /> Informations obligatoires manquantes
          </label>
          <div role="group" aria-label="Affichage" className="inline-flex rounded-lg border border-[#E7E4DD] bg-white p-0.5">
            {(['table', 'cards'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn('h-7 rounded-md px-2.5 text-[12px] font-semibold', view === v ? 'bg-[#171717] text-[#FFFFFF]' : 'text-[#4A4740] hover:bg-[#F4F2EE]')}>
                {v === 'table' ? 'Tableau' : 'Cartes'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error && <ErrorBox error={error} onRetry={() => refetch()} />}

      {isLoading ? <Skeleton className="h-80" /> : !rows.length ? (
        <Card><EmptyState icon={Home} title={data?.length ? 'Aucune maison pour ces filtres' : 'Aucune maison d’hôtes'} action={!data?.length && <button type="button" className={button('primary')} onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Créer la première</button>} /></Card>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((g) => <GuesthouseCard key={g.id} g={g} />)}
        </div>
      ) : (
        <Card bodyClassName="p-0 sm:p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="bg-[#FBFAF8]">
                <tr>
                  <th className={th}>Maison</th><th className={th}>Gouvernorat</th><th className={th}>Propriétaire</th><th className={th}>Statut</th><th className={th}>Mode</th>
                  <th className={cn(th, 'text-right')}>Prix base</th><th className={cn(th, 'text-right')}>Capacité</th><th className={cn(th, 'text-right')}>Réserv.</th><th className={th}>360°</th><th className={th}>Modifiée</th><th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id} className="cursor-pointer border-t border-[#F1EFEA] hover:bg-[#FBFAF8]" onClick={() => router.push(`/admin/guesthouses/${g.id}`)}>
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <Thumb src={g.coverImage} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <Link href={`/admin/guesthouses/${g.id}`} onClick={(e) => e.stopPropagation()} className="max-w-[15rem] truncate font-semibold hover:text-[#8A6514]">{g.name}</Link>
                            {g.isDemo && <span className="rounded bg-[#F1EFEA] px-1 text-[10px] font-bold text-[#6B6760]">DÉMO</span>}
                          </span>
                          <span className="flex items-center gap-1 text-[11.5px] text-[#8A867E]">
                            {g.city}
                            {g.missing.length > 0 && <span className="inline-flex items-center gap-0.5 text-amber-700" title={`Manque : ${g.missing.join(', ')}`}><AlertTriangle className="size-3" /> {g.missing.length} à compléter</span>}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={cn(td, 'text-[#4A4740]')}>{g.governorate ?? '—'}</td>
                    <td className={cn(td, 'max-w-[11rem] truncate')}>{g.owner?.name ?? <span className="text-[#9A968D]">Non assigné</span>}</td>
                    <td className={td}><StatusBadge status={g.publicState} map={PUBLIC_STATE} /></td>
                    <td className={cn(td, 'text-[#4A4740]')}>{g.bookingMode === 'instant' ? 'Instantané' : 'Sur demande'}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{g.basePrice ? fmtTND(g.basePrice) : '—'}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{g.capacity ?? '—'}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{g.reservations}{g.pendingReservations > 0 && <span className="ml-1 rounded bg-amber-50 px-1 text-[11px] font-semibold text-amber-800">{g.pendingReservations} att.</span>}</td>
                    <td className={cn(td, 'text-[#4A4740]')}>{TOUR[g.tour]}{g.tour === 'scenes' ? ` (${g.sceneCount})` : ''}</td>
                    <td className={cn(td, 'text-[#6B6760]')}>{fmtDay(g.updatedAt)}</td>
                    <td className={cn(td, 'text-right')} onClick={(e) => e.stopPropagation()}>
                      {g.publicState === 'published' && g.slug && (
                        <a href={`/maison-d-hote/${g.slug}`} target="_blank" rel="noopener noreferrer" className={button('ghost', 'h-7 px-2')} aria-label={`Voir la fiche publique de ${g.name}`}><ExternalLink className="size-3.5" /></a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3 md:hidden">{rows.map((g) => <GuesthouseCard key={g.id} g={g} />)}</div>
        </Card>
      )}

      <CreateDrawer open={createOpen} onOpenChange={setCreateOpen} owners={owners.data ?? []}
        onCreated={(id) => { qc.invalidateQueries({ queryKey: ['admin-guesthouses'] }); qc.invalidateQueries({ queryKey: ['admin-properties'] }); router.push(`/admin/guesthouses/${id}`); }} />
    </div>
  );
}

function Thumb({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={cn('size-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5', className)} />
  ) : (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg bg-[#F1EFEA] text-[#9A968D]', className)}><Home className="size-4" /></span>
  );
}

function GuesthouseCard({ g }: { g: GuesthouseRow }) {
  return (
    <Link href={`/admin/guesthouses/${g.id}`} className="group overflow-hidden rounded-xl border border-[#E7E4DD] bg-white transition-shadow hover:shadow-[0_6px_20px_rgba(23,23,23,0.07)]">
      <div className="relative aspect-[16/9] bg-[#F1EFEA]">
        {g.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        ) : <span className="grid size-full place-items-center text-[#9A968D]"><Home className="size-6" /></span>}
        <span className="absolute left-2 top-2"><StatusBadge status={g.publicState} map={PUBLIC_STATE} /></span>
        {g.tour !== 'none' && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#171717]/80 px-2 py-0.5 text-[11px] font-semibold text-[#FFFFFF]"><View className="size-3" /> 360°</span>}
      </div>
      <div className="p-3">
        <p className="truncate text-[14px] font-semibold text-[#171717] group-hover:text-[#8A6514]">{g.name}</p>
        <p className="truncate text-[12px] text-[#6B6760]">{[g.city, g.governorate].filter(Boolean).join(' · ')} · {g.owner?.name ?? 'Non assigné'}</p>
        <div className="mt-2 flex items-center justify-between text-[12px]">
          <span className="text-[#4A4740]">{g.basePrice ? `${fmtTND(g.basePrice)} / nuit` : 'Tarif à définir'}</span>
          <span className="text-[#8A867E]">{g.reservations} réserv.</span>
        </div>
        {g.missing.length > 0 && <p className="mt-2 flex items-center gap-1 text-[11.5px] text-amber-800"><AlertTriangle className="size-3.5" /> Manque : {g.missing.join(', ')}</p>}
      </div>
    </Link>
  );
}

function CreateDrawer({ open, onOpenChange, owners, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; owners: { id: string; fullName: string }[]; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ name: '', city: '', governorate: '', ownerId: '', rentalMode: 'entire' as 'entire' | 'rooms' });
  const m = useMutation({
    mutationFn: () => createGuesthouse({ name: f.name.trim(), city: f.city.trim(), governorate: f.governorate || undefined, ownerId: f.ownerId || undefined, rentalMode: f.rentalMode }),
    onSuccess: (d) => { toast.success('Brouillon créé — complétez la fiche avant publication.'); onOpenChange(false); setF({ name: '', city: '', governorate: '', ownerId: '', rentalMode: 'entire' }); onCreated(d.id); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Création impossible.'),
  });
  const valid = f.name.trim().length >= 2 && f.city.trim().length >= 1;
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Nouvelle maison d’hôtes" description="Créée en brouillon, non publique. Vous compléterez photos, tarifs et visite 360° ensuite."
      footer={<div className="flex justify-end gap-2"><button type="button" className={button('ghost')} onClick={() => onOpenChange(false)}>Annuler</button><button type="submit" form="create-gh" className={button('primary')} disabled={!valid || m.isPending}>{m.isPending && <Spinner />} Créer le brouillon</button></div>}>
      <form id="create-gh" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) m.mutate(); }}>
        <div><label htmlFor="c-name" className={labelCls}>Nom de la maison *</label><input id="c-name" required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={140} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="c-city" className={labelCls}>Ville *</label><input id="c-city" required className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={80} /></div>
          <div>
            <label htmlFor="c-gov" className={labelCls}>Gouvernorat</label>
            <select id="c-gov" className={selectCls} value={f.governorate} onChange={(e) => setF({ ...f, governorate: e.target.value })}>
              <option value="">—</option>{GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="c-owner" className={labelCls}>Propriétaire</label>
          <select id="c-owner" className={selectCls} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}>
            <option value="">À assigner plus tard</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className={labelCls}>Type de location</legend>
          <div className="grid grid-cols-2 gap-2">
            {([['entire', 'Maison entière', 'Un seul prix par nuit'], ['rooms', 'Par chambre', 'Chaque chambre est réservable']] as const).map(([v, l, d]) => (
              <label key={v} className={cn('cursor-pointer rounded-lg border p-3 text-[12.5px]', f.rentalMode === v ? 'border-[#C99628] bg-[#FBF6EA]' : 'border-[#E7E4DD]')}>
                <input type="radio" name="rentalMode" className="sr-only" checked={f.rentalMode === v} onChange={() => setF({ ...f, rentalMode: v })} />
                <span className="block font-semibold text-[#171717]">{l}</span><span className="text-[#6B6760]">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}

export default function GuesthousesPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><GuesthousesInner /></Suspense>;
}
