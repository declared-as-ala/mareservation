'use client';

/**
 * Calendrier des séjours — replaces the legacy /admin/calendrier.
 *  · Planning: timeline of every maison (rows) × days, from the real management calendar (bookings, requests, blocks).
 *  · Gestion par maison: month view with block/unblock, manual booking and request handling (VenueCalendarManager,
 *    backed by /owner-hotel endpoints that accept ADMIN and enforce overlap prevention server-side).
 */
import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGetRaw } from '@/lib/api/client';
import { fetchOwners, fetchProperties } from '@/lib/api/admin-console';
import { VenueCalendarManager } from '@/components/booking/VenueCalendarManager';
import { Card, EmptyState, PageHeader, Skeleton, addDays, button, labelCls, selectCls, todayTunis } from '@/components/admin/console/ui';
import { ReservationDrawer } from '@/components/admin/console/ReservationDrawer';
import { cn } from '@/lib/utils';

interface MgmtCalendar {
  today: string;
  days: Record<string, { status: 'available' | 'reserved' | 'pending' | 'blocked' | 'past' | 'unconfigured'; availableRooms: number }>;
  reservations: { id: string; reference: string; checkIn: string; checkOut: string; status: string; guestName: string; roomName: string | null }[];
  blocks: { id: string; from: string; to: string; reason: string }[];
}

const CELL: Record<string, string> = {
  available: 'bg-white',
  reserved: 'bg-[#C99628]',
  partial: 'bg-[linear-gradient(to_top,#C99628_0,#C99628_45%,#FFFFFF_45%)]',
  pending: 'bg-[repeating-linear-gradient(135deg,#F3DFAE_0,#F3DFAE_4px,#FBF1DA_4px,#FBF1DA_8px)]',
  blocked: 'bg-[repeating-linear-gradient(135deg,#D6D2C8_0,#D6D2C8_3px,#EFEDE8_3px,#EFEDE8_7px)]',
  past: 'bg-[#F4F2EE]',
  unconfigured: 'bg-[#F4F2EE]',
};
const LEGEND: [string, string][] = [['reserved', 'Complet'], ['partial', 'Partiellement réservé'], ['pending', 'Demande en attente'], ['blocked', 'Bloqué'], ['available', 'Disponible'], ['past', 'Passé / non configuré']];

export default function StaysCalendarPage() {
  const [tab, setTab] = useState<'timeline' | 'manage'>('timeline');
  const [span, setSpan] = useState<14 | 31>(14);
  const [start, setStart] = useState(() => addDays(todayTunis(), -2));
  const [ownerId, setOwnerId] = useState('');
  const [status, setStatus] = useState<'all' | 'reserved' | 'pending' | 'blocked'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const properties = useQuery({ queryKey: ['admin-properties'], queryFn: fetchProperties, staleTime: 120_000 });
  const owners = useQuery({ queryKey: ['admin-owners'], queryFn: fetchOwners, staleTime: 300_000 });
  const maisons = useMemo(
    () => (properties.data ?? []).filter((p) => p.type === 'MAISON_DHOTE' && (!ownerId || p.owner?.id === ownerId)),
    [properties.data, ownerId]
  );
  const end = addDays(start, span - 1);
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDays(start, i)), [start, span]);

  const calendars = useQueries({
    queries: maisons.map((m) => ({
      queryKey: ['admin-mgmt-calendar', m.id, start, end],
      queryFn: async () => (await apiGetRaw<{ data: MgmtCalendar }>(`/admin-bookings/properties/${m.id}/calendar?from=${start}&to=${end}`)).data,
      enabled: tab === 'timeline',
      staleTime: 30_000,
    })),
  });
  const today = todayTunis();

  return (
    <div className="space-y-4">
      <PageHeader title="Calendrier des séjours" subtitle="Disponibilités réelles de chaque maison — réservations, demandes et dates bloquées (heure de Tunis)" />

      <div role="tablist" aria-label="Vue du calendrier" className="inline-flex rounded-lg border border-[#E7E4DD] bg-white p-0.5">
        {([['timeline', 'Planning des maisons'], ['manage', 'Gestion par maison']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}
            className={cn('h-8 rounded-md px-3 text-[12.5px] font-semibold', tab === k ? 'bg-[#171717] text-[#FFFFFF]' : 'text-[#4A4740] hover:bg-[#F4F2EE]')}>{l}</button>
        ))}
      </div>

      {tab === 'manage' ? (
        properties.isLoading ? <Skeleton className="h-96" /> : !maisons.length ? <EmptyState icon={CalendarDays} title="Aucune maison" /> : (
          <Card bodyClassName="p-3 sm:p-5">
            <VenueCalendarManager
              title="Gestion par maison"
              venues={maisons.map((p) => ({ id: p.id, name: p.name, subtitle: `${p.owner?.fullName ?? 'sans propriétaire'}${p.isDemo ? ' · démo' : ''}` }))}
            />
          </Card>
        )
      ) : (
        <Card bodyClassName="p-0 sm:p-0">
          <div className="flex flex-wrap items-end gap-3 border-b border-[#E7E4DD] p-3 sm:p-4">
            <div className="flex items-center gap-1">
              <button type="button" className={button('outline', 'h-9 w-9 px-0')} onClick={() => setStart(addDays(start, -span))} aria-label="Période précédente"><ChevronLeft className="size-4" /></button>
              <button type="button" className={button('outline')} onClick={() => setStart(addDays(todayTunis(), -2))}>Aujourd’hui</button>
              <button type="button" className={button('outline', 'h-9 w-9 px-0')} onClick={() => setStart(addDays(start, span))} aria-label="Période suivante"><ChevronRight className="size-4" /></button>
            </div>
            <div role="group" aria-label="Durée affichée" className="inline-flex rounded-lg border border-[#E7E4DD] bg-white p-0.5">
              {([14, 31] as const).map((n) => (
                <button key={n} type="button" aria-pressed={span === n} onClick={() => setSpan(n)}
                  className={cn('h-8 rounded-md px-2.5 text-[12px] font-semibold', span === n ? 'bg-[#171717] text-[#FFFFFF]' : 'text-[#4A4740] hover:bg-[#F4F2EE]')}>{n === 14 ? '2 semaines' : 'Mois'}</button>
              ))}
            </div>
            <div className="min-w-[12rem]">
              <label htmlFor="cal-owner" className={labelCls}>Propriétaire</label>
              <select id="cal-owner" className={selectCls} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Tous</option>
                {(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
              </select>
            </div>
            <div className="min-w-[11rem]">
              <label htmlFor="cal-status" className={labelCls}>Mettre en évidence</label>
              <select id="cal-status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="all">Tout</option><option value="reserved">Confirmés</option><option value="pending">Demandes</option><option value="blocked">Blocages</option>
              </select>
            </div>
            <p className="ml-auto text-[12px] text-[#6B6760]">
              {new Date(`${start}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – {new Date(`${end}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
            </p>
          </div>

          {properties.isLoading ? <div className="p-4"><Skeleton className="h-64" /></div> : !maisons.length ? (
            <EmptyState icon={CalendarDays} title="Aucune maison pour ce filtre" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[12px]" aria-label="Planning des maisons">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 min-w-[11rem] border-b border-r border-[#E7E4DD] bg-[#FBFAF8] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B6760]">Maison</th>
                    {days.map((d) => {
                      const dt = new Date(`${d}T00:00:00Z`);
                      const we = [0, 6].includes(dt.getUTCDay());
                      return (
                        <th key={d} scope="col" className={cn('min-w-[30px] border-b border-[#E7E4DD] px-0 py-1.5 text-center font-medium', d === today ? 'bg-[#F7F1E3] text-[#8A6514]' : we ? 'bg-[#FBFAF8] text-[#8A867E]' : 'bg-[#FBFAF8] text-[#6B6760]')}>
                          <span className="block text-[10px] uppercase">{dt.toLocaleDateString('fr-FR', { weekday: 'narrow', timeZone: 'UTC' })}</span>
                          <span className="block tabular-nums">{dt.getUTCDate()}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {maisons.map((m, i) => {
                    const cal = calendars[i]?.data;
                    const byDay = new Map<string, { id: string; label: string }>();
                    for (const r of cal?.reservations ?? []) {
                      for (let d = r.checkIn; d < r.checkOut; d = addDays(d, 1)) if (!byDay.has(d)) byDay.set(d, { id: r.id, label: `${r.guestName}${r.roomName ? ` · ${r.roomName}` : ''} (${r.reference})` });
                    }
                    return (
                      <tr key={m.id}>
                        <th scope="row" className="sticky left-0 z-10 border-b border-r border-[#E7E4DD] bg-white px-3 py-2 text-left font-medium text-[#171717]">
                          <span className="block max-w-[13rem] truncate">{m.name}</span>
                          <span className="block truncate text-[11px] font-normal text-[#8A867E]">{m.owner?.fullName ?? 'Sans propriétaire'}{m.rentalMode === 'rooms' ? ` · ${m.roomsCount} ch.` : ' · maison entière'}</span>
                        </th>
                        {days.map((d) => {
                          if (calendars[i]?.isLoading) return <td key={d} className="border-b border-[#F1EFEA] p-0.5"><div className="h-7 animate-pulse rounded bg-[#F4F2EE]" /></td>;
                          const raw = cal?.days[d]?.status ?? 'unconfigured';
                          // Room-based maisons: "available" while at least one room is free — show partial occupancy explicitly.
                          const st = raw === 'available' && m.rentalMode === 'rooms' && (cal?.days[d]?.availableRooms ?? m.roomsCount) < m.roomsCount ? 'partial' : raw;
                          const dim = status !== 'all' && st !== status && !(status === 'reserved' && st === 'partial');
                          const res = byDay.get(d);
                          const title = `${d} — ${LEGEND.find(([k]) => k === st)?.[1] ?? st}${res ? ` · ${res.label}` : ''}${cal?.days[d] && m.rentalMode === 'rooms' ? ` · ${cal.days[d].availableRooms} ch. libre(s)` : ''}`;
                          return (
                            <td key={d} className={cn('border-b border-[#F1EFEA] p-0.5', d === today && 'bg-[#FBF6EA]')}>
                              {res ? (
                                <button type="button" title={title} aria-label={title} onClick={() => setOpenId(res.id)}
                                  className={cn('block h-7 w-full rounded-[4px] ring-1 ring-inset ring-black/5 transition-opacity hover:opacity-80', CELL[st], dim && 'opacity-25')} />
                              ) : (
                                <div title={title} className={cn('h-7 rounded-[4px] ring-1 ring-inset ring-[#EFEDE8]', CELL[st], dim && 'opacity-25')} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E7E4DD] px-4 py-3 text-[11.5px] text-[#4A4740]">
            {LEGEND.map(([k, l]) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cn('size-3 rounded-[3px] ring-1 ring-inset ring-black/10', CELL[k])} aria-hidden="true" />{l}</span>)}
            <span className="ml-auto text-[#8A867E]">Cliquez une nuit réservée pour ouvrir la réservation. Les blocages et réservations manuelles se gèrent dans « Gestion par maison ».</span>
          </div>
        </Card>
      )}

      <ReservationDrawer id={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
