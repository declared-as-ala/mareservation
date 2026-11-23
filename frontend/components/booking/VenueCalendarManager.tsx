'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CalendarDays, CalendarPlus, Check, Loader2, LockOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiDeleteRaw, apiGetRaw, apiPostRaw } from '@/lib/api/client';
import { addDaysKey, formatLong, monthEndKey, monthStartKey, nightsBetweenKeys, toKey } from '@/lib/booking/dates';
import { AvailabilityCalendar, type CalendarCellInfo } from './AvailabilityCalendar';
import type { CalendarRoom, DayStatus } from '@/lib/api/bookings';

export interface ManagedVenue {
  id: string;
  name: string;
  subtitle?: string;
}

interface MgmtCalendar {
  venue: { id: string; name: string; isDemo: boolean };
  today: string;
  rooms: CalendarRoom[];
  days: Record<string, { status: DayStatus; availableRooms: number; rooms: Record<string, DayStatus> }>;
  reservations: { id: string; reference: string; roomId: string | null; roomName: string | null; checkIn: string; checkOut: string; nights: number; status: string; guestName: string; phone?: string; email?: string; adults?: number; children?: number; total: number | null; source?: string; specialRequest?: string; isDemo?: boolean; paymentStatus?: string }[];
  blocks: { id: string; roomId: string | null; scope: string; from: string; to: string; reason: string; note?: string; createdByName: string | null; createdByRole?: string }[];
}
interface Summary {
  total: number; pending: number; confirmed: number; cancelled: number; rejected: number; expired: number;
  upcomingCheckIns: number; upcomingCheckOuts: number; occupancyRate: number | null;
  arrivalsToday?: number; departuresToday?: number; revenueMonth?: number; completed?: number; noShow?: number;
}

const REASONS: [string, string][] = [
  ['offline_booking', 'Réservation externe'],
  ['maintenance', 'Maintenance'],
  ['owner_hold', 'Usage personnel'],
  ['emergency', 'Indisponibilité temporaire'],
  ['other', 'Autre'],
];
const STATUS_FR: Record<string, string> = {
  pending: 'En attente', PENDING: 'En attente', confirmed: 'Confirmée', CONFIRMED: 'Confirmée', checked_in: 'Sur place',
  cancelled: 'Annulée', rejected: 'Refusée', expired: 'Expirée', completed: 'Terminée', no_show: 'Non présenté',
};
const field = 'h-11 w-full rounded-xl border border-white/10 bg-[#0B0B0C] px-3 text-sm text-white outline-none focus:border-amber-400/60';

export function VenueCalendarManager({ venues, title }: { venues: ManagedVenue[]; title: string }) {
  const qc = useQueryClient();
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '');
  const [month, setMonth] = useState(() => { const n = new Date(); return toKey(n.getFullYear(), n.getMonth(), 1); });
  const [roomId, setRoomId] = useState('');
  const [range, setRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [blockOpen, setBlockOpen] = useState(false);
  const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const effectiveVenue = venueId || venues[0]?.id || '';
  const from = month;
  const to = monthEndKey(monthStartKey(month, 1));

  const cal = useQuery({
    queryKey: ['mgmt-calendar', effectiveVenue, from, to],
    enabled: !!effectiveVenue,
    queryFn: async () => (await apiGetRaw<{ data: MgmtCalendar }>(`/owner-hotel/venues/${effectiveVenue}/calendar?from=${from}&to=${to}`)).data,
    refetchInterval: 20_000,
    placeholderData: (p) => p,
  });
  const summary = useQuery({
    queryKey: ['mgmt-summary', effectiveVenue],
    enabled: !!effectiveVenue,
    queryFn: async () => (await apiGetRaw<{ data: Summary }>(`/owner-hotel/venues/${effectiveVenue}/summary`)).data,
    refetchInterval: 30_000,
  });
  const data = cal.data;
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['mgmt-calendar'] }); void qc.invalidateQueries({ queryKey: ['mgmt-summary'] }); };
  const errText = (e: unknown) => (e instanceof Error ? e.message : 'Action impossible.');

  const cells = useMemo(() => {
    const out: Record<string, CalendarCellInfo> = {};
    if (!data) return out;
    for (const k of Object.keys(data.days)) {
      const d = data.days[k];
      out[k] = { status: roomId && d.rooms[roomId] ? d.rooms[roomId] : d.status };
    }
    return out;
  }, [data, roomId]);

  const onDay = (key: string) => {
    if (!range.start || range.end) setRange({ start: key, end: null });
    else if (key < range.start) setRange({ start: key, end: null });
    else setRange({ start: range.start, end: key });
  };

  const createBlock = useMutation({
    mutationFn: (b: { scope: 'room' | 'venue'; roomId?: string; startsAt: string; endsAt: string; reason: string; note?: string }) =>
      apiPostRaw(`/owner-hotel/venues/${effectiveVenue}/blocks`, b),
    onSuccess: () => { setBlockOpen(false); setRange({ start: null, end: null }); setMsg({ ok: true, text: 'Dates bloquées. Elles sont indisponibles sur le site.' }); refresh(); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const removeBlock = useMutation({
    mutationFn: (id: string) => apiDeleteRaw(`/owner-hotel/blocks/${id}`),
    onSuccess: () => { setConfirmUnblock(null); setMsg({ ok: true, text: 'Dates débloquées.' }); refresh(); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const act = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'accept' | 'reject' | 'cancel' | 'check-out' | 'no-show'; body?: object }) =>
      apiPostRaw(`/owner-hotel/reservations/${id}/${action}`, body ?? {}),
    onSuccess: () => { setRejecting(null); setReason(''); setMsg({ ok: true, text: 'Réservation mise à jour.' }); refresh(); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });

  const createManual = useMutation({
    mutationFn: (b: Record<string, unknown>) => apiPostRaw(`/owner-hotel/venues/${effectiveVenue}/reservations/manual`, b),
    onSuccess: () => { setManualOpen(false); setRange({ start: null, end: null }); setMsg({ ok: true, text: 'Réservation manuelle enregistrée : les dates sont bloquées sur le site.' }); refresh(); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const realRooms = (data?.rooms ?? []).filter((r) => r.id !== 'entire');

  const lastNight = range.end ? addDaysKey(range.end, -1) : null;
  const s = summary.data;

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl font-black sm:text-3xl"><CalendarDays className="size-6 text-amber-400" aria-hidden="true" /> {title}</h1>
          <p className="mt-1 text-sm text-neutral-400">Vert : disponible · Rouge : réservé · Orange : en attente · Gris : bloqué</p>
        </div>
        {venues.length > 1 && (
          <select aria-label="Hébergement" value={effectiveVenue} onChange={(e) => { setVenueId(e.target.value); setRoomId(''); setRange({ start: null, end: null }); }} className={cn(field, 'w-auto min-w-64')}>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.subtitle ? ` — ${v.subtitle}` : ''}</option>)}
          </select>
        )}
      </header>

      {s && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ['Arrivées aujourd’hui', s.arrivalsToday ?? 0], ['Départs aujourd’hui', s.departuresToday ?? 0], ['En attente', s.pending], ['Confirmées', s.confirmed],
            ['Arrivées (7 j)', s.upcomingCheckIns], ['Départs (7 j)', s.upcomingCheckOuts], ['Occupation (30 j)', s.occupancyRate == null ? '—' : `${s.occupancyRate} %`],
            ['Revenu du mois', `${(s.revenueMonth ?? 0).toLocaleString('fr-TN')} TND`], ['Annulées / refusées', s.cancelled + s.rejected + s.expired], ['Total', s.total],
          ].map(([k, v]) => (
            <li key={k as string} className="rounded-2xl border border-white/10 bg-[#111112] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{k}</p>
              <p className="mt-1 font-serif text-2xl font-black text-amber-400">{v}</p>
            </li>
          ))}
        </ul>
      )}

      {msg && <p role="status" className={cn('rounded-xl border px-4 py-3 text-sm', msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300')}>{msg.text}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-4 sm:p-6" aria-label="Calendrier">
          {realRooms.length > 1 && (
            <select aria-label="Chambre" value={roomId} onChange={(e) => setRoomId(e.target.value)} className={cn(field, 'mb-4 w-auto')}>
              <option value="">Toute la maison</option>
              {realRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {data && data.rooms.length === 0 && <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-sm text-amber-100/90">Aucun hébergement réservable n&apos;est configuré{data.venue.isDemo ? ' (démonstration)' : ''} : ajoutez des chambres ou passez en location « maison entière » dans les paramètres de réservation.</p>}
          <AvailabilityCalendar month={month} onMonthChange={setMonth} months={2} days={cells} selection={range}
            isClickable={(k, i) => !!i && i.status !== 'unconfigured'} onDayClick={onDay} loading={cal.isFetching && !data} />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-sm text-neutral-300" aria-live="polite">
              {range.start && range.end ? `Du ${formatLong(range.start)} au ${formatLong(lastNight!)} (${nightsBetweenKeys(range.start, range.end)} nuit${nightsBetweenKeys(range.start, range.end) > 1 ? 's' : ''})` : range.start ? 'Choisissez le dernier jour à bloquer…' : 'Sélectionnez des dates puis bloquez-les.'}
            </p>
            <button type="button" disabled={!range.start} onClick={() => { if (!range.end) setRange({ start: range.start, end: addDaysKey(range.start!, 1) }); setBlockOpen(true); }}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black hover:bg-amber-300 disabled:opacity-40">
              <Ban className="size-4" aria-hidden="true" /> Bloquer les dates
            </button>
            <button type="button" disabled={!range.start || !data?.rooms.length} onClick={() => { if (!range.end) setRange({ start: range.start, end: addDaysKey(range.start!, 1) }); setManualOpen(true); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-400/50 px-5 text-sm font-bold text-amber-200 hover:bg-amber-400/10 disabled:opacity-40">
              <CalendarPlus className="size-4" aria-hidden="true" /> Réservation manuelle
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-4 sm:p-6" aria-label="Blocages">
            <h2 className="font-serif text-xl font-bold">Dates bloquées</h2>
            {!data?.blocks.length ? <p className="mt-3 text-sm text-neutral-500">Aucun blocage sur cette période.</p> : (
              <ul className="mt-3 space-y-2">
                {data.blocks.map((b) => (
                  <li key={b.id} className="rounded-xl border border-white/10 bg-[#0B0B0C] p-3 text-sm">
                    <p className="font-semibold text-white">{b.from} → {b.to}</p>
                    <p className="text-neutral-400">{REASONS.find(([k]) => k === b.reason)?.[1] ?? b.reason}{b.note ? ` — ${b.note}` : ''} · {b.roomId ? realRooms.find((r) => r.id === b.roomId)?.name ?? 'Chambre' : 'Toute la maison'}</p>
                    <p className="text-xs text-neutral-500">Par {b.createdByName ?? '—'}{b.createdByRole ? ` (${b.createdByRole === 'ADMIN' ? 'admin' : 'propriétaire'})` : ''}</p>
                    {confirmUnblock === b.id ? (
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => removeBlock.mutate(b.id)} disabled={removeBlock.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-bold text-white">{removeBlock.isPending && <Loader2 className="size-3 animate-spin" />}Confirmer le déblocage</button>
                        <button type="button" onClick={() => setConfirmUnblock(null)} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold">Annuler</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmUnblock(b.id)} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-bold hover:border-amber-400/50 hover:text-amber-300"><LockOpen className="size-3.5" aria-hidden="true" /> Débloquer les dates</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-4 sm:p-6" aria-label="Réservations">
        <h2 className="font-serif text-xl font-bold">Réservations de la période</h2>
        {!data?.reservations.length ? <p className="mt-3 text-sm text-neutral-500">Aucune réservation sur cette période.</p> : (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {data.reservations.map((r) => {
              const st = r.status.toLowerCase();
              return (
                <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="text-sm">
                    <p><span className="font-mono font-bold text-amber-300">{r.reference}</span> <span className={cn('ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold', st === 'pending' ? 'bg-orange-500/15 text-orange-300' : 'bg-emerald-500/15 text-emerald-300')}>{STATUS_FR[r.status] ?? r.status}</span>{r.isDemo && <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">DÉMO</span>}{r.source && r.source !== 'web-request' && r.source !== 'web' && <span className="ml-2 text-xs text-neutral-500">manuelle ({r.source})</span>}</p>
                    <p className="mt-1 text-white">{r.guestName || 'Client'} · {r.phone ?? '—'}{r.email ? ` · ${r.email}` : ''}</p>
                    <p className="text-neutral-400">{r.checkIn} → {r.checkOut} ({r.nights} nuit{r.nights > 1 ? 's' : ''}) · {r.roomName ?? '—'} · {(r.adults ?? 0) + (r.children ?? 0)} pers.{r.total != null ? ` · ${r.total} TND` : ''}</p>
                    {r.specialRequest && <p className="mt-1 text-neutral-500">« {r.specialRequest} »</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {st === 'pending' && (rejecting === r.id ? (
                      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); act.mutate({ id: r.id, action: 'reject', body: { reason } }); }}>
                        <input aria-label="Motif du refus" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du refus" className={cn(field, 'h-9 w-48')} />
                        <button type="submit" className="h-9 rounded-lg bg-red-500 px-3 text-xs font-bold text-white">Refuser</button>
                        <button type="button" onClick={() => setRejecting(null)} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold"><X className="size-4" aria-label="Fermer" /></button>
                      </form>
                    ) : (
                      <>
                        <button type="button" onClick={() => act.mutate({ id: r.id, action: 'accept' })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-black"><Check className="size-4" aria-hidden="true" /> Confirmer</button>
                        <button type="button" onClick={() => setRejecting(r.id)} className="h-9 rounded-lg border border-red-500/40 px-3 text-xs font-bold text-red-300">Refuser</button>
                      </>
                    ))}
                    {['confirmed', 'checked_in'].includes(st) && r.checkIn <= (data?.today ?? '') && (
                      <>
                        <button type="button" onClick={() => act.mutate({ id: r.id, action: 'check-out' })} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold hover:border-emerald-400/50">Séjour terminé</button>
                        {st === 'confirmed' && <button type="button" onClick={() => act.mutate({ id: r.id, action: 'no-show' })} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold hover:border-red-400/50">Non présenté</button>}
                      </>
                    )}
                    {['pending', 'confirmed', 'checked_in'].includes(st) && rejecting !== r.id && (
                      <button type="button" onClick={() => act.mutate({ id: r.id, action: 'cancel', body: { reason: 'Annulée depuis le calendrier' } })} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold hover:border-amber-400/50">Annuler</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {blockOpen && range.start && range.end && (
        <BlockDialog
          start={range.start} end={range.end} rooms={realRooms} defaultRoom={roomId} pending={createBlock.isPending}
          onClose={() => setBlockOpen(false)}
          onSubmit={(v) => createBlock.mutate({ scope: v.roomId ? 'room' : 'venue', roomId: v.roomId || undefined, startsAt: v.start, endsAt: v.end, reason: v.reason, note: v.note || undefined })}
        />
      )}
      {manualOpen && range.start && range.end && (
        <ManualDialog start={range.start} end={range.end} rooms={realRooms} pending={createManual.isPending} onClose={() => setManualOpen(false)} onSubmit={(b) => createManual.mutate(b)} />
      )}
    </div>
  );
}

function BlockDialog({ start, end, rooms, defaultRoom, pending, onClose, onSubmit }: {
  start: string; end: string; rooms: CalendarRoom[]; defaultRoom: string; pending: boolean; onClose: () => void;
  onSubmit: (v: { start: string; end: string; roomId: string; reason: string; note: string }) => void;
}) {
  const [s, setS] = useState(start);
  const [e, setE] = useState(addDaysKey(end, -1)); // inclusive last blocked night in the UI
  const [roomId, setRoomId] = useState(defaultRoom);
  const [reason, setReason] = useState('offline_booking');
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/75" onClick={onClose} tabIndex={-1} />
      <form role="dialog" aria-modal="true" aria-label="Bloquer les dates" className="relative w-full max-w-md space-y-4 rounded-t-3xl border border-white/10 bg-[#111112] p-6 sm:rounded-3xl"
        onSubmit={(ev) => { ev.preventDefault(); onSubmit({ start: s, end: addDaysKey(e, 1), roomId, reason, note }); }}>
        <h2 className="font-serif text-2xl font-black text-white">Bloquer les dates</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-neutral-300">Date de début<input type="date" required value={s} onChange={(x) => setS(x.target.value)} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Date de fin<input type="date" required min={s} value={e} onChange={(x) => setE(x.target.value)} className={cn(field, 'mt-1')} /></label>
        </div>
        <label className="block text-sm text-neutral-300">Hébergement
          <select value={roomId} onChange={(x) => setRoomId(x.target.value)} className={cn(field, 'mt-1')}>
            <option value="">Toute la maison</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="block text-sm text-neutral-300">Motif
          <select value={reason} onChange={(x) => setReason(x.target.value)} className={cn(field, 'mt-1')}>
            {REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="block text-sm text-neutral-300">Note (facultatif)<input value={note} maxLength={500} onChange={(x) => setNote(x.target.value)} className={cn(field, 'mt-1')} /></label>
        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 font-black text-black hover:bg-amber-300 disabled:opacity-60">{pending && <Loader2 className="size-4 animate-spin" />}Bloquer</button>
          <button type="button" onClick={onClose} className="h-12 rounded-xl border border-white/15 px-5 font-bold text-white">Annuler</button>
        </div>
      </form>
    </div>
  );
}

function ManualDialog({ start, end, rooms, pending, onClose, onSubmit }: {
  start: string; end: string; rooms: CalendarRoom[]; pending: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/75" onClick={onClose} tabIndex={-1} />
      <form role="dialog" aria-modal="true" aria-label="Réservation manuelle" className="relative max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111112] p-6 sm:rounded-3xl"
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          const price = String(f.get('price') ?? '');
          onSubmit({
            checkIn: f.get('checkIn'), checkOut: f.get('checkOut'), adults: Number(f.get('adults')), children: Number(f.get('children')),
            firstName: f.get('firstName'), lastName: f.get('lastName'), phone: f.get('phone'), email: f.get('email') || undefined,
            source: f.get('source'), notes: f.get('notes') || undefined, price: price === '' ? undefined : Number(price),
            roomIds: picked.length ? picked : undefined,
          });
        }}>
        <h2 className="font-serif text-2xl font-black text-white">Réservation manuelle</h2>
        <p className="text-sm text-neutral-400">Téléphone, WhatsApp, agence… La réservation est confirmée et bloque immédiatement les dates sur le site (mêmes contrôles de disponibilité).</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-neutral-300">Arrivée<input name="checkIn" type="date" required defaultValue={start} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Départ<input name="checkOut" type="date" required defaultValue={end} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Adultes<input name="adults" type="number" min={1} max={20} defaultValue={2} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Enfants<input name="children" type="number" min={0} max={20} defaultValue={0} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Prénom<input name="firstName" required maxLength={80} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Nom<input name="lastName" required maxLength={80} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Téléphone<input name="phone" required maxLength={30} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">E-mail<input name="email" type="email" maxLength={160} className={cn(field, 'mt-1')} /></label>
          <label className="text-sm text-neutral-300">Source
            <select name="source" defaultValue="phone" className={cn(field, 'mt-1')}>
              <option value="phone">Téléphone</option><option value="whatsapp">WhatsApp</option><option value="walk_in">Sur place</option><option value="agency">Agence</option><option value="other">Autre</option>
            </select>
          </label>
          <label className="text-sm text-neutral-300">Prix total (TND)<input name="price" type="number" min={0} step="0.01" placeholder="Tarif calculé" className={cn(field, 'mt-1')} /></label>
        </div>
        {rooms.length > 0 && (
          <fieldset className="rounded-xl border border-white/10 p-3 text-sm text-neutral-300">
            <legend className="px-1">Chambres (vide = choix automatique)</legend>
            {rooms.map((r) => (
              <label key={r.id} className="mt-1 flex items-center gap-2"><input type="checkbox" className="size-4 accent-amber-400" checked={picked.includes(r.id)} onChange={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} />{r.name} · {r.capacity} pers.</label>
            ))}
          </fieldset>
        )}
        <label className="block text-sm text-neutral-300">Note interne<input name="notes" maxLength={1000} className={cn(field, 'mt-1')} /></label>
        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 font-black text-black hover:bg-amber-300 disabled:opacity-60">{pending && <Loader2 className="size-4 animate-spin" />}Enregistrer</button>
          <button type="button" onClick={onClose} className="h-12 rounded-xl border border-white/15 px-5 font-bold text-white">Annuler</button>
        </div>
      </form>
    </div>
  );
}
