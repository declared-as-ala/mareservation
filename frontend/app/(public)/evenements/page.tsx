'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Search, ScanEye, Sparkles, Ticket } from 'lucide-react';
import { fetchEvents } from '@/lib/api/events';
import { EventCard } from '@/components/cards/EventCard';
import { cn } from '@/lib/utils';
import type { Event } from '@/lib/api/types';

const EVENT_TYPES = [
  { value: 'all', label: 'Tous' },
  { value: 'concert', label: 'Concerts' },
  { value: 'standup', label: 'Stand-up' },
  { value: 'cinema', label: 'Cinema' },
  { value: 'festival', label: 'Festivals' },
  { value: 'sport', label: 'Sport' },
];

function getEventCover(event?: Event | null) {
  if (!event) return null;
  const venue = event.venueId as any;
  return event.coverImage ?? event.imageUrl ?? venue?.coverImage ?? venue?.gallery?.[0] ?? null;
}

function getVenueCity(event: Event) {
  const venue = event.venueId;
  return typeof venue === 'object' ? venue.city || '' : '';
}

function eventHas360(event: Event) {
  const venue = event.venueId as any;
  return Boolean(venue && typeof venue === 'object' && (venue.hasVirtualTour || venue.immersiveFile || venue.immersiveType === 'view-360'));
}

function minTicketPrice(event: Event) {
  const prices = (event.ticketTypes ?? [])
    .filter((ticket) => ticket.isActive !== false)
    .map((ticket) => Number(ticket.price || 0));
  return prices.length ? Math.min(...prices) : null;
}

function EvenementsPageInner() {
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [city, setCity] = useState('all');
  const [dayKey, setDayKey] = useState<string | null>(null); // YYYY-MM-DD

  // Initialise from URL: /evenements?type=sport
  useEffect(() => {
    const t = sp.get('type');
    if (t) setType(t.toLowerCase());
  }, [sp]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['public-events-marketplace'],
    queryFn: () => fetchEvents({ upcoming: true }),
  });

  const cities = useMemo(() => {
    return Array.from(new Set(events.map(getVenueCity).filter(Boolean))).sort();
  }, [events]);

  // ── 14-day scrubber ───────────────────────────────────────────
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        key,
        date: d,
        dayName: d.toLocaleDateString('fr-TN', { weekday: 'short' }).replace('.', ''),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('fr-TN', { month: 'short' }).replace('.', ''),
        isToday: i === 0,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (!e.startAt) continue;
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = q.trim().toLowerCase();
    return events.filter((event) => {
      const venue = typeof event.venueId === 'object' ? event.venueId : null;
      const matchQuery = !query || [event.title, event.description, venue?.name, venue?.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      const matchType =
        type === 'all' ||
        String(event.type ?? '').toLowerCase() === type.toLowerCase() ||
        // Treat SPORT/SPORTS/MATCH as the same "sport" bucket
        (type.toLowerCase() === 'sport' &&
          ['sport', 'sports', 'match'].includes(String(event.type ?? '').toLowerCase()));
      const matchCity = city === 'all' || venue?.city === city;
      let matchDay = true;
      if (dayKey && event.startAt) {
        const d = new Date(event.startAt);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        matchDay = k === dayKey;
      }
      return matchQuery && matchType && matchCity && matchDay;
    });
  }, [city, events, q, type, dayKey]);

  const featured = filteredEvents[0] ?? events[0] ?? null;
  const heroImage = getEventCover(featured);
  const totalTickets = events.reduce((sum, event) => {
    return sum + (event.ticketTypes ?? []).reduce((inner, ticket) => inner + Math.max(0, Number(ticket.capacity || 0) - Number(ticket.sold || 0)), 0);
  }, 0);
  const with360 = events.filter(eventHas360).length;

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100">
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0">
          {heroImage ? (
            <Image src={heroImage} alt="" fill priority className="object-cover opacity-35" sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_28%_18%,rgba(251,191,36,0.2),transparent_30%),linear-gradient(135deg,#18181b,#030303)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,0.98),rgba(8,8,8,0.72)_52%,rgba(8,8,8,0.96))]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#080808] to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-18">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
              <Sparkles className="size-3.5" />
              Evenements premium
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              Concerts, shows, cinema et experiences avec vrais billets QR.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              Decouvrez les evenements disponibles, regardez les photos du lieu, explorez les vues 360 quand elles existent, puis choisissez votre billet Normal ou VIP.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur">
              <Calendar className="mb-3 size-5 text-amber-300" />
              <p className="text-2xl font-black text-white">{events.length}</p>
              <p className="text-sm text-zinc-500">evenements a venir</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur">
              <Ticket className="mb-3 size-5 text-amber-300" />
              <p className="text-2xl font-black text-white">{totalTickets}</p>
              <p className="text-sm text-zinc-500">billets disponibles</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur">
              <ScanEye className="mb-3 size-5 text-amber-300" />
              <p className="text-2xl font-black text-white">{with360}</p>
              <p className="text-sm text-zinc-500">lieux avec visite 360</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* 14-day date scrubber */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-white sm:text-lg">Choisissez votre date</h2>
            {dayKey && (
              <button
                type="button"
                onClick={() => setDayKey(null)}
                className="text-[11px] font-semibold text-amber-400 hover:underline"
              >
                Toutes les dates
              </button>
            )}
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6">
            {days.map((d) => {
              const count = eventsByDay.get(d.key) ?? 0;
              const active = dayKey === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDayKey(active ? null : d.key)}
                  disabled={count === 0 && !active}
                  className={cn(
                    'flex w-16 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 transition-all',
                    active
                      ? 'border-amber-400/55 bg-amber-400/[0.12]'
                      : count === 0
                      ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.02] opacity-40'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/25'
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-wider',
                      active ? 'text-amber-300' : d.isWeekend ? 'text-amber-400/70' : 'text-white/45'
                    )}
                  >
                    {d.isToday ? "Auj." : d.dayName}
                  </span>
                  <span
                    className={cn(
                      'font-serif text-xl font-black leading-none',
                      active ? 'text-amber-200' : 'text-white'
                    )}
                  >
                    {d.dayNum}
                  </span>
                  <span
                    className={cn(
                      'text-[8.5px] font-semibold uppercase tracking-wider',
                      active ? 'text-amber-300/80' : 'text-white/40'
                    )}
                  >
                    {d.monthName}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex h-1 w-6 items-center justify-center rounded-full',
                      count > 0 ? (active ? 'bg-amber-400' : 'bg-emerald-400/70') : 'bg-transparent'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky top-3 z-20 mb-7 rounded-3xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl shadow-black/30 backdrop-blur md:p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Rechercher evenement, lieu, ville..."
                className="h-12 w-full rounded-2xl border border-zinc-800 bg-black pl-11 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-12 rounded-2xl border border-zinc-800 bg-black px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
            >
              {EVENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-12 rounded-2xl border border-zinc-800 bg-black px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
            >
              <option value="all">Toutes les villes</option>
              {cities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {featured ? (
          <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="relative min-h-[300px]">
                {getEventCover(featured) ? (
                  <Image src={getEventCover(featured)!} alt={featured.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 540px" />
                ) : (
                  <div className="grid h-full place-items-center bg-zinc-900 text-zinc-700">
                    <Calendar className="size-12" />
                  </div>
                )}
              </div>
              <div className="p-5 md:p-7">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black">A ne pas manquer</span>
                  {eventHas360(featured) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                      <ScanEye className="size-3.5" />
                      Visite 360
                    </span>
                  ) : null}
                </div>
                <h2 className="text-3xl font-black text-white">{featured.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{featured.description}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                    <Calendar className="mb-2 size-4 text-amber-300" />
                    <p className="text-sm font-bold text-white">{new Date(featured.startAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                    <MapPin className="mb-2 size-4 text-amber-300" />
                    <p className="line-clamp-1 text-sm font-bold text-white">{typeof featured.venueId === 'object' ? featured.venueId.name : 'Lieu'}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                    <Ticket className="mb-2 size-4 text-amber-300" />
                    <p className="text-sm font-bold text-white">
                      {minTicketPrice(featured) != null ? `Des ${minTicketPrice(featured)} TND` : 'Billets ouverts'}
                    </p>
                  </div>
                </div>
                <a
                  href={`/evenement/${featured.slug || featured._id}`}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300"
                >
                  Voir l'evenement
                </a>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">Tous les evenements</h2>
          <span className="text-sm text-zinc-500">{filteredEvents.length} resultat{filteredEvents.length > 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[360px] animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
            ))}
          </div>
        ) : filteredEvents.length ? (
          <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <motion.div key={event._id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <EventCard event={event} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/60 p-10 text-center">
            <Calendar className="mx-auto mb-3 size-10 text-zinc-700" />
            <p className="font-semibold text-zinc-300">Aucun evenement trouve.</p>
            <p className="mt-1 text-sm text-zinc-500">Essayez une autre ville, une autre categorie ou revenez bientot.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EvenementsPage() {
  return (
    <Suspense fallback={null}>
      <EvenementsPageInner />
    </Suspense>
  );
}
