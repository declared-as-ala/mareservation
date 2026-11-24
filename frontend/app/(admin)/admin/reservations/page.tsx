'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck2, Download, Search, X } from 'lucide-react';
import { downloadReservationsCsv, fetchOwners, fetchProperties, fetchReservations, type ReservationQuery } from '@/lib/api/admin-console';
import {
  Card, EmptyState, ErrorBox, PAYMENT_STATUS, PageHeader, Pagination, RES_STATUS, Skeleton, Spinner, StatusBadge, button, fmtDay, fmtStayDay,
  fmtTND, inputCls, labelCls, selectCls, td, th, todayTunis,
} from '@/components/admin/console/ui';
import { ReservationDrawer } from '@/components/admin/console/ReservationDrawer';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  ['', 'Tous les statuts'], ['pending', 'À confirmer'], ['confirmed', 'Confirmées'], ['live', 'Confirmées + terminées'], ['completed', 'Terminées'],
  ['cancelled', 'Annulées'], ['rejected', 'Refusées'], ['expired', 'Expirées'], ['no_show', 'Non présentés'],
] as const;
const SORT_OPTIONS = [['created_desc', 'Plus récentes'], ['created_asc', 'Plus anciennes'], ['checkin_asc', 'Arrivée la plus proche'], ['checkin_desc', 'Arrivée la plus lointaine'], ['total_desc', 'Montant décroissant']] as const;

function ReservationsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const get = (k: string) => sp.get(k) ?? '';

  // "today=1" (from dashboard arrivals/departures) pins the date range to today.
  const today = get('today') === '1' ? todayTunis() : '';
  const query: ReservationQuery = {
    status: get('status') || undefined,
    venueId: get('venueId') || undefined,
    ownerId: get('ownerId') || undefined,
    customerId: get('customerId') || undefined,
    q: get('q') || undefined,
    from: today || get('from') || undefined,
    to: today || get('to') || undefined,
    dateField: (get('dateField') as ReservationQuery['dateField']) || undefined,
    bookingMode: get('bookingMode') || undefined,
    sort: get('sort') || 'created_desc',
    page: Number(get('page')) || 1,
    limit: 20,
    demo: get('demo') === '1',
  };
  const setParams = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (resetPage && !('page' in patch)) next.delete('page');
    if ('from' in patch || 'to' in patch || 'dateField' in patch) next.delete('today');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-reservations', query],
    queryFn: () => fetchReservations(query),
    placeholderData: (prev) => prev,
  });
  const properties = useQuery({ queryKey: ['admin-properties'], queryFn: fetchProperties, staleTime: 300_000 });
  const owners = useQuery({ queryKey: ['admin-owners'], queryFn: fetchOwners, staleTime: 300_000 });
  const [search, setSearch] = useState(get('q'));
  const maisons = useMemo(() => (properties.data ?? []).filter((p) => p.type === 'MAISON_DHOTE'), [properties.data]);
  const activeFilters = ['status', 'venueId', 'ownerId', 'customerId', 'q', 'from', 'to', 'bookingMode', 'today'].filter((k) => get(k));
  const isPending = query.status === 'pending';

  const exportCsv = async () => {
    setExporting(true);
    try { await downloadReservationsCsv(query); toast.success('Export CSV téléchargé.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Export impossible.'); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={isPending ? 'Réservations à confirmer' : 'Toutes les réservations'}
        subtitle={isPending ? 'Demandes en attente de réponse — les plus anciennes expirent en premier' : 'Recherchez, filtrez et gérez chaque séjour'}
        actions={<button type="button" onClick={exportCsv} disabled={exporting} className={button('outline')}>{exporting ? <Spinner /> : <Download className="size-4" />} Export CSV</button>}
      />

      <Card bodyClassName="p-3 sm:p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" onSubmit={(e) => { e.preventDefault(); setParams({ q: search.trim() || null }); }}>
          <div className="sm:col-span-2">
            <label htmlFor="f-q" className={labelCls}>Recherche</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9A968D]" aria-hidden="true" />
              <input id="f-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => search.trim() !== get('q') && setParams({ q: search.trim() || null })}
                placeholder="Référence, client, e-mail, téléphone" className={cn(inputCls, 'pl-8')} />
            </div>
          </div>
          <div>
            <label htmlFor="f-status" className={labelCls}>Statut</label>
            <select id="f-status" className={selectCls} value={get('status')} onChange={(e) => setParams({ status: e.target.value || null })}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-venue" className={labelCls}>Maison d’hôtes</label>
            <select id="f-venue" className={selectCls} value={get('venueId')} onChange={(e) => setParams({ venueId: e.target.value || null })}>
              <option value="">Toutes</option>
              {maisons.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isDemo ? ' (démo)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-owner" className={labelCls}>Propriétaire</label>
            <select id="f-owner" className={selectCls} value={get('ownerId')} onChange={(e) => setParams({ ownerId: e.target.value || null })}>
              <option value="">Tous</option>
              {(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-mode" className={labelCls}>Mode</label>
            <select id="f-mode" className={selectCls} value={get('bookingMode')} onChange={(e) => setParams({ bookingMode: e.target.value || null })}>
              <option value="">Tous</option><option value="request">Sur demande</option><option value="instant">Instantané</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-datefield" className={labelCls}>Dates sur</label>
            <select id="f-datefield" className={selectCls} value={get('dateField') || 'created'} onChange={(e) => setParams({ dateField: e.target.value === 'created' ? null : e.target.value })}>
              <option value="created">Création</option><option value="checkIn">Arrivée</option><option value="checkOut">Départ</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-from" className={labelCls}>Du</label>
            <input id="f-from" type="date" className={inputCls} value={query.from ?? ''} onChange={(e) => setParams({ from: e.target.value || null })} />
          </div>
          <div>
            <label htmlFor="f-to" className={labelCls}>Au</label>
            <input id="f-to" type="date" className={inputCls} value={query.to ?? ''} min={query.from} onChange={(e) => setParams({ to: e.target.value || null })} />
          </div>
          <div>
            <label htmlFor="f-sort" className={labelCls}>Tri</label>
            <select id="f-sort" className={selectCls} value={query.sort} onChange={(e) => setParams({ sort: e.target.value })}>
              {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-[12.5px] text-[#4A4740]">
              <input type="checkbox" checked={query.demo} onChange={(e) => setParams({ demo: e.target.checked ? '1' : null })} className="size-4 accent-[#C99628]" /> Inclure la démo
            </label>
            {activeFilters.length > 0 && (
              <button type="button" className={button('ghost', 'ml-auto')} onClick={() => { setSearch(''); router.replace(pathname); }}>
                <X className="size-4" /> Réinitialiser
              </button>
            )}
          </div>
        </form>
      </Card>

      {error && <ErrorBox error={error} onRetry={() => refetch()} />}

      <Card bodyClassName="p-0 sm:p-0">
        {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : !data?.rows.length ? (
          <EmptyState icon={CalendarCheck2} title={isPending ? 'Aucune demande en attente' : 'Aucune réservation'} text={activeFilters.length ? 'Aucun résultat pour ces filtres.' : 'Les réservations apparaîtront ici.'} />
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn('hidden overflow-x-auto md:block', isFetching && 'opacity-70')}>
              <table className="w-full">
                <thead className="bg-[#FBFAF8]">
                  <tr>
                    <th className={th}>Référence</th><th className={th}>Client</th><th className={th}>Maison</th><th className={th}>Propriétaire</th>
                    <th className={th}>Arrivée</th><th className={th}>Départ</th><th className={cn(th, 'text-right')}>Nuits</th><th className={cn(th, 'text-right')}>Voy.</th>
                    <th className={cn(th, 'text-right')}>Total</th><th className={th}>Statut</th><th className={th}>Paiement</th><th className={th}>Créée</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} tabIndex={0} onClick={() => setOpenId(r.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(r.id)}
                      className="cursor-pointer border-t border-[#F1EFEA] outline-none hover:bg-[#FBFAF8] focus-visible:bg-[#F7F1E3]">
                      <td className={cn(td, 'font-mono text-[12px]')}>{r.reference}{r.isDemo && <span className="ml-1.5 rounded bg-[#F1EFEA] px-1 text-[10px] font-bold text-[#6B6760]">DÉMO</span>}</td>
                      <td className={td}><span className="block max-w-[11rem] truncate">{r.guest.name ?? '—'}</span><span className="block max-w-[11rem] truncate text-[11.5px] text-[#8A867E]">{r.guest.email}</span></td>
                      <td className={cn(td, 'max-w-[13rem] truncate')}>{r.property?.name ?? '—'}</td>
                      <td className={cn(td, 'max-w-[10rem] truncate text-[#4A4740]')}>{r.owner?.name ?? '—'}</td>
                      <td className={td}>{fmtStayDay(r.checkIn)}</td>
                      <td className={td}>{fmtStayDay(r.checkOut)}</td>
                      <td className={cn(td, 'text-right tabular-nums')}>{r.nights}</td>
                      <td className={cn(td, 'text-right tabular-nums')}>{r.adults ?? '—'}{r.children ? `+${r.children}` : ''}</td>
                      <td className={cn(td, 'text-right font-semibold tabular-nums')}>{fmtTND(r.total)}</td>
                      <td className={td}><StatusBadge status={r.status} /></td>
                      <td className={td}><StatusBadge status={r.paymentStatus} map={PAYMENT_STATUS} /></td>
                      <td className={cn(td, 'text-[#6B6760]')}>{fmtDay(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-[#F1EFEA] md:hidden">
              {data.rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)} className="w-full px-4 py-3 text-left hover:bg-[#FBFAF8]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-[#171717]">{r.guest.name ?? '—'}</span>
                        <span className="block truncate text-[12px] text-[#6B6760]">{r.property?.name}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-[#4A4740]">
                      <span>{fmtStayDay(r.checkIn, { day: 'numeric', month: 'short' })} → {fmtStayDay(r.checkOut, { day: 'numeric', month: 'short' })} · {r.nights} n.</span>
                      <span className="font-semibold tabular-nums text-[#171717]">{fmtTND(r.total)}</span>
                    </div>
                    <span className="mt-1 block font-mono text-[11px] text-[#8A867E]">{r.reference}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} total={data.total} label={`réservation${data.total > 1 ? 's' : ''}`} onPage={(p) => setParams({ page: String(p) }, false)} />
          </>
        )}
      </Card>

      <p className="text-[11.5px] text-[#8A867E]">
        Statuts : {Object.entries(RES_STATUS).map(([, v]) => v.label).join(' · ')}. Les montants sont des valeurs réservées, pas des encaissements.
      </p>

      <ReservationDrawer id={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

export default function AdminReservationsPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><ReservationsInner /></Suspense>;
}
