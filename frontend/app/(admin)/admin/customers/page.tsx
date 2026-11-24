'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { fetchCustomer, fetchCustomers } from '@/lib/api/admin-console';
import {
  Card, Drawer, EmptyState, ErrorBox, Field, PageHeader, Pagination, Skeleton, StatusBadge, fmtDateTime, fmtDay, fmtStayDay, fmtTND, inputCls, selectCls, td, th, todayTunis,
} from '@/components/admin/console/ui';
import { ReservationDrawer } from '@/components/admin/console/ReservationDrawer';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-customers', query, status, page],
    queryFn: () => fetchCustomers({ q: query || undefined, status: status || undefined, page }),
    placeholderData: (p) => p,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle="Comptes voyageurs et historique de réservation" />
      <Card bodyClassName="p-3 sm:p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }}>
          <div className="relative">
            <label htmlFor="c-q" className="sr-only">Recherche</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9A968D]" aria-hidden="true" />
            <input id="c-q" type="search" className={cn(inputCls, 'pl-8')} placeholder="Nom, e-mail, téléphone — Entrée pour chercher" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => { if (q.trim() !== query) { setQuery(q.trim()); setPage(1); } }} />
          </div>
          <select aria-label="Statut du compte" className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tous les comptes</option><option value="active">Actifs</option><option value="suspended">Suspendus</option>
          </select>
        </form>
      </Card>
      {error && <ErrorBox error={error} onRetry={() => refetch()} />}
      <Card bodyClassName="p-0 sm:p-0">
        {isLoading ? <div className="p-4"><Skeleton className="h-64" /></div> : !data?.rows.length ? <EmptyState icon={Users} title={query ? 'Aucun client trouvé' : 'Aucun client'} /> : (
          <>
            <div className={cn('hidden overflow-x-auto md:block', isFetching && 'opacity-70')}>
              <table className="w-full">
                <thead className="bg-[#FBFAF8]"><tr>
                  <th className={th}>Client</th><th className={th}>Téléphone</th><th className={cn(th, 'text-right')}>Réservations</th><th className={cn(th, 'text-right')}>Valeur confirmée</th>
                  <th className={th}>Dernière réservation</th><th className={th}>Compte</th><th className={th}>Inscrit</th>
                </tr></thead>
                <tbody>
                  {data.rows.map((c) => (
                    <tr key={c.id} className="cursor-pointer border-t border-[#F1EFEA] hover:bg-[#FBFAF8]" onClick={() => setOpenId(c.id)}>
                      <td className={td}><span className="block font-semibold">{c.fullName}</span><span className="block text-[11.5px] text-[#8A867E]">{c.email}{!c.emailVerified && ' · non vérifié'}</span></td>
                      <td className={cn(td, 'text-[#4A4740]')}>{c.phone ?? '—'}</td>
                      <td className={cn(td, 'text-right tabular-nums')}>{c.bookings}</td>
                      <td className={cn(td, 'text-right font-semibold tabular-nums')}>{c.confirmedValue ? fmtTND(c.confirmedValue) : '—'}</td>
                      <td className={cn(td, 'text-[#6B6760]')}>{c.lastBooking ? fmtDay(c.lastBooking) : '—'}</td>
                      <td className={td}>{c.isActive ? <span className="text-[12px] text-emerald-700">Actif</span> : <span className="text-[12px] text-red-700">Suspendu</span>}</td>
                      <td className={cn(td, 'text-[#6B6760]')}>{fmtDay(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#F1EFEA] md:hidden">
              {data.rows.map((c) => (
                <li key={c.id}><button type="button" className="w-full px-4 py-3 text-left hover:bg-[#FBFAF8]" onClick={() => setOpenId(c.id)}>
                  <span className="block truncate font-semibold">{c.fullName}</span><span className="block truncate text-[12px] text-[#6B6760]">{c.email}</span>
                  <span className="mt-1 block text-[12px] text-[#4A4740]">{c.bookings} réservation{c.bookings > 1 ? 's' : ''}{c.confirmedValue ? ` · ${fmtTND(c.confirmedValue)}` : ''}</span>
                </button></li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} label="clients" />
          </>
        )}
      </Card>
      <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CustomerDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-customer', id], queryFn: () => fetchCustomer(id!), enabled: !!id });
  const [resId, setResId] = useState<string | null>(null);
  const today = todayTunis();
  const groups = useMemo(() => {
    const rows = data?.reservations ?? [];
    const isCancelled = (s: string) => ['cancelled', 'rejected', 'expired', 'no_show'].includes(s);
    return {
      upcoming: rows.filter((r) => !isCancelled(r.status) && r.checkOut.slice(0, 10) >= today),
      past: rows.filter((r) => !isCancelled(r.status) && r.checkOut.slice(0, 10) < today),
      cancelled: rows.filter((r) => isCancelled(r.status)),
    };
  }, [data, today]);
  const c = data?.customer;
  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()} title={c?.fullName ?? 'Client'} description={c?.email}>
      {isLoading ? <Skeleton className="h-64" /> : error ? <ErrorBox error={error} /> : c ? (
        <div className="space-y-5">
          <dl className="divide-y divide-[#F1EFEA]">
            <Field label="E-mail"><a className="text-[#8A6514] hover:underline" href={`mailto:${c.email}`}>{c.email}</a>{c.emailVerified ? '' : ' (non vérifié)'}</Field>
            <Field label="Téléphone">{c.phone ?? '—'}</Field>
            <Field label="Compte">{c.isActive === false ? 'Suspendu' : 'Actif'}</Field>
            <Field label="Inscrit le">{fmtDay(c.createdAt)}</Field>
            <Field label="Dernière connexion">{c.lastLoginAt ? fmtDateTime(c.lastLoginAt) : '—'}</Field>
          </dl>
          {([['upcoming', 'À venir'], ['past', 'Passées'], ['cancelled', 'Annulées / refusées']] as const).map(([k, l]) => (
            <section key={k}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">{l} ({groups[k].length})</h3>
              {!groups[k].length ? <p className="text-[12.5px] text-[#9A968D]">Aucune.</p> : (
                <ul className="divide-y divide-[#F1EFEA] rounded-xl border border-[#E7E4DD]">
                  {groups[k].map((r) => (
                    <li key={r.id}><button type="button" onClick={() => setResId(r.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[12.5px] hover:bg-[#FBFAF8]">
                      <span className="min-w-0"><span className="block truncate font-medium">{r.property?.name}</span><span className="text-[#8A867E]">{fmtStayDay(r.checkIn, { day: 'numeric', month: 'short', year: 'numeric' })} · {r.nights} nuit{r.nights > 1 ? 's' : ''}</span></span>
                      <span className="flex shrink-0 items-center gap-2"><span className="tabular-nums">{fmtTND(r.total)}</span><StatusBadge status={r.status} /></span>
                    </button></li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <ReservationDrawer id={resId} open={!!resId} onOpenChange={(o) => !o && setResId(null)} />
        </div>
      ) : null}
    </Drawer>
  );
}
