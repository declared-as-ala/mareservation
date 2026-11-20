'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Loader2, Minus, Plus, ShieldAlert, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchCalendar, fetchQuote, type CalendarRoom, type DayStatus } from '@/lib/api/bookings';
import {
  addDaysKey, formatLong, formatMoney, monthEndKey, monthStartKey, nightsBetweenKeys, toKey,
} from '@/lib/booking/dates';
import { AvailabilityCalendar, type CalendarCellInfo } from './AvailabilityCalendar';
import { BookingRequestDialog } from './BookingRequestDialog';

const DEMO_NOTICE =
  "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.";

interface Props {
  /** Venue slug or id. */
  venueKey: string;
  venueName: string;
  /** Anchor of the 360° tour, offered as the alternative CTA when booking is closed. */
  tourAnchor?: string;
  className?: string;
}

const Stepper = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
    <span className="text-sm font-medium text-neutral-200">{label}</span>
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" aria-label={`Moins de ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}
        className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-amber-400/60 disabled:opacity-30">
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center text-base font-bold tabular-nums text-white" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Plus de ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}
        className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-amber-400/60 disabled:opacity-30">
        <Plus className="size-4" />
      </button>
    </div>
  </div>
);

export function BookingWidget({ venueKey, venueName, tourAnchor = '#visite', className }: Props) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return toKey(n.getFullYear(), n.getMonth(), 1);
  });
  const [range, setRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomId, setRoomId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [justBooked, setJustBooked] = useState(false);

  const from = month;
  const to = monthEndKey(monthStartKey(month, 1));

  const cal = useQuery({
    queryKey: ['booking-calendar', venueKey, from, to],
    queryFn: () => fetchCalendar(venueKey, from, to),
    refetchInterval: 30_000, // safety net; the stream below makes updates near-instant
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
  const data = cal.data;
  const bookable = !!data?.bookable;
  const rooms: CalendarRoom[] = data?.rooms ?? [];

  // Real-time: any booking / block / cancellation on this venue refreshes the calendar.
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/v1/venues/${encodeURIComponent(venueKey)}/availability-stream`);
      es.onmessage = () => {
        void qc.invalidateQueries({ queryKey: ['booking-calendar', venueKey] });
        void qc.invalidateQueries({ queryKey: ['booking-quote'] });
      };
    } catch {
      /* polling covers it */
    }
    return () => es?.close();
  }, [venueKey, qc]);

  const statusFor = (key: string): DayStatus => {
    const day = data?.days[key];
    if (!day) return 'unconfigured';
    if (roomId && day.rooms[roomId]) return day.rooms[roomId];
    return day.status;
  };

  const cells = useMemo(() => {
    const out: Record<string, CalendarCellInfo> = {};
    if (!data) return out;
    for (const key of Object.keys(data.days)) {
      const day = data.days[key];
      out[key] = { status: roomId && day.rooms[roomId] ? day.rooms[roomId] : day.status };
    }
    return out;
  }, [data, roomId]);

  const maxCapacity = rooms.length ? Math.max(...rooms.map((r) => r.capacity)) : 10;
  const selectedRoom = rooms.find((r) => r.id === roomId);
  const capacity = selectedRoom?.capacity ?? maxCapacity;

  const onDay = (key: string) => {
    setNotice(null);
    const st = statusFor(key);
    const picking = range.start && !range.end;
    if (!picking) {
      if (st === 'available') setRange({ start: key, end: null });
      else setNotice("Choisissez une date d'arrivée disponible (en vert).");
      return;
    }
    if (key <= range.start!) {
      if (st === 'available') setRange({ start: key, end: null });
      return;
    }
    // Check-out day is exclusive: only the NIGHTS before it must be free.
    for (let k = range.start!; k < key; k = addDaysKey(k, 1)) {
      if (data?.days[k] && statusFor(k) !== 'available') {
        setNotice('Certaines nuits de cette période ne sont pas disponibles. Choisissez d’autres dates.');
        return;
      }
    }
    if (nightsBetweenKeys(range.start!, key) > 30) {
      setNotice('Séjour limité à 30 nuits.');
      return;
    }
    setRange({ start: range.start, end: key });
  };

  const isClickable = (key: string, info?: CalendarCellInfo) => {
    if (!bookable || !info) return false;
    if (info.status === 'past' || info.status === 'unconfigured') return false;
    if (range.start && !range.end && key > range.start) return true; // possible departure day
    return info.status === 'available';
  };

  const nights = range.start && range.end ? nightsBetweenKeys(range.start, range.end) : 0;
  const stayParams = data && range.start && range.end
    ? { venueId: data.venue.id, roomId: roomId || undefined, checkIn: range.start, checkOut: range.end, adults, children }
    : null;
  const quote = useQuery({
    queryKey: ['booking-quote', stayParams],
    queryFn: () => fetchQuote(stayParams!),
    enabled: bookable && !!stayParams,
    staleTime: 10_000,
  });
  const q = quote.data;
  const available = !!q && q.ok && q.available;
  const unavailableMsg = q && q.ok && !q.available ? q.message : null;

  // A booking elsewhere may invalidate the current selection: drop it.
  useEffect(() => {
    if (q && q.ok && !q.available && (q.reason === 'UNAVAILABLE')) setNotice(q.message);
  }, [q]);

  const reset = () => setRange({ start: null, end: null });

  return (
    <div className={cn('rounded-[1.75rem] border border-white/10 bg-[#111112] p-4 shadow-2xl sm:p-7', className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400">Réservation</p>
          <h2 className="mt-1 font-serif text-2xl font-black text-white sm:text-3xl">Réserver cette maison d&apos;hôtes</h2>
        </div>
        <CalendarCheck2 className="mt-1 hidden size-7 shrink-0 text-amber-400/70 sm:block" aria-hidden="true" />
      </div>

      {data && !bookable && (
        <div role="note" className="mb-5 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4 text-sm leading-relaxed text-amber-100/90">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
          <p>
            {data.reason === 'DEMO' ? DEMO_NOTICE : "Les disponibilités de cette maison ne sont pas encore configurées par son propriétaire."}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* ── calendar ── */}
        <div>
          {cal.isError ? (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              Impossible de charger les disponibilités.{' '}
              <button type="button" className="underline" onClick={() => cal.refetch()}>Réessayer</button>
            </p>
          ) : (
            <AvailabilityCalendar
              month={month}
              onMonthChange={(m) => setMonth(m)}
              months={2}
              days={cells}
              selection={range}
              isClickable={isClickable}
              onDayClick={onDay}
              loading={cal.isFetching && !data}
            />
          )}
          <p role="status" aria-live="polite" className={cn('mt-3 min-h-5 text-sm', notice ? 'text-orange-300' : 'text-neutral-500')}>
            {notice ?? (bookable ? (range.start && !range.end ? 'Choisissez maintenant votre date de départ.' : !range.start ? "Choisissez votre date d'arrivée (en vert)." : '') : '')}
          </p>
        </div>

        {/* ── summary ── */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Arrivée</p>
              <p className="mt-0.5 font-semibold text-white">{range.start ? formatLong(range.start) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Départ</p>
              <p className="mt-0.5 font-semibold text-white">{range.end ? formatLong(range.end) : '—'}</p>
            </div>
          </div>

          <Stepper label="Adultes" value={adults} min={1} max={Math.max(1, capacity - children)} onChange={setAdults} />
          <Stepper label="Enfants" value={children} min={0} max={Math.max(0, capacity - adults)} onChange={setChildren} />

          {rooms.length > 1 && (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200"><Users className="size-4 text-amber-400" aria-hidden="true" /> Hébergement</span>
              <select value={roomId} onChange={(e) => { setRoomId(e.target.value); reset(); }}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B0B0C] px-4 text-sm text-white outline-none focus:border-amber-400/60">
                <option value="">Meilleure disponibilité (automatique)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.capacity} pers.{r.pricePerNight > 0 ? ` · ${formatMoney(r.pricePerNight)}/nuit` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {rooms.length === 1 && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-neutral-300">
              <span className="font-semibold text-white">{rooms[0].name}</span> — {rooms[0].capacity} pers.
              {rooms[0].pricePerNight > 0 && <> · {formatMoney(rooms[0].pricePerNight)} / nuit</>}
            </p>
          )}

          {/* indicator + price */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0B0C] p-4" aria-live="polite">
            {!stayParams ? (
              <p className="text-sm text-neutral-500">Sélectionnez vos dates pour voir le tarif et la disponibilité.</p>
            ) : quote.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Vérification…</p>
            ) : available && q && q.ok && q.available ? (
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 font-semibold text-emerald-300"><span className="size-2.5 rounded-full bg-emerald-400" aria-hidden="true" /> Disponible</p>
                <p className="text-neutral-300">{nights} nuit{nights > 1 ? 's' : ''}{q.room.name ? ` · ${q.room.name}` : ''}</p>
                {q.pricePerNight != null && <p className="text-neutral-400">{formatMoney(q.pricePerNight)} × {nights} nuit{nights > 1 ? 's' : ''}</p>}
                <p className="flex items-baseline justify-between border-t border-white/10 pt-2">
                  <span className="text-neutral-300">Total</span>
                  <span className="font-serif text-2xl font-black text-amber-400">{q.total != null ? formatMoney(q.total) : 'Tarif à confirmer'}</span>
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-sm font-medium text-red-300"><span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-red-500" aria-hidden="true" /> {unavailableMsg ?? quote.error?.message ?? 'Indisponible pour ces dates.'}</p>
            )}
          </div>

          {bookable ? (
            <button type="button" disabled={!available} onClick={() => setDialogOpen(true)}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-base font-black text-black shadow-[0_10px_28px_rgba(245,158,11,0.35)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
              Réserver maintenant
            </button>
          ) : (
            <>
              <button type="button" disabled aria-disabled="true" className="flex h-14 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-base font-bold text-neutral-500">
                Réservations non ouvertes
              </button>
              <Link href={tourAnchor} className="flex h-12 w-full items-center justify-center rounded-2xl border border-amber-400/40 text-sm font-bold text-amber-300 transition hover:bg-amber-400 hover:text-black">
                Découvrir la visite 360°
              </Link>
            </>
          )}
          {bookable && <p className="text-center text-xs text-neutral-500">Aucun paiement en ligne : votre demande est transmise à la maison, qui la confirme.</p>}
        </div>
      </div>

      {stayParams && data && (
        <BookingRequestDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); if (justBooked) { reset(); setJustBooked(false); } }}
          venueName={venueName}
          params={stayParams}
          quote={q && q.ok && q.available ? q : null}
          onBooked={() => { setJustBooked(true); void qc.invalidateQueries({ queryKey: ['booking-calendar', venueKey] }); }}
          onConflict={(msg) => { setDialogOpen(false); setNotice(msg); reset(); void qc.invalidateQueries({ queryKey: ['booking-calendar', venueKey] }); }}
        />
      )}
    </div>
  );
}
