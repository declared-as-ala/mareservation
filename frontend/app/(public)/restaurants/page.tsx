'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  UtensilsCrossed,
  Users,
  Calendar,
  Clock,
  X,
  Sparkles,
  Shield,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { cn } from '@/lib/utils';

// ── Time slot helpers ───────────────────────────────────────────────────────

const SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
  '23:00', '23:30', '00:00',
];

const SLOT_GROUPS: { label: string; range: string[] }[] = [
  { label: 'Matin', range: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  { label: 'Midi', range: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'] },
  { label: 'Soir', range: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'] },
  { label: 'Minuit', range: ['00:00'] },
];

function todayLabel(): string {
  return new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: '2-digit', month: 'long' });
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [slot, setSlot] = useState('19:00');
  const [guests, setGuests] = useState(2);
  const [trouverOpen, setTrouverOpen] = useState(false);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['restaurants', search],
    queryFn: () =>
      fetchVenues({
        type: 'RESTAURANT',
        q: search || undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Split: top of result list = "Réserver ce soir" rail (first 3 with virtual tour)
  const featuredSlot = venues.filter((v) => v.hasVirtualTour).slice(0, 3);
  const rest = venues.filter((v) => !featuredSlot.includes(v));

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* ── Hero with Resy-style booking strip ── */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#15110a] to-[#0B0B0C] px-4 py-7 sm:px-6 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-amber-500/[0.08] blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-amber-600/[0.06] blur-[90px]" />

        <div className="relative mx-auto max-w-7xl">
          {/* Back button — on its own row so it never overlaps */}
          <div className="mb-4 flex">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/[0.08] px-2.5 py-1">
            <UtensilsCrossed className="size-3 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Restaurants</span>
          </span>
          <h1 className="mt-4 font-serif text-3xl font-black leading-[1.04] tracking-tight text-white sm:text-4xl md:text-5xl">
            Réservez votre table,{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              ce soir.
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Les meilleurs restaurants en Tunisie. Choisissez votre date, vos invités, votre créneau —
            et réservez en deux clics.
          </p>

          {/* Booking strip */}
          <div className="mt-6 flex flex-col gap-2 rounded-3xl border border-white/[0.07] bg-[#111111] p-3 sm:flex-row sm:items-center sm:flex-wrap sm:p-2">
            {/* Date pill */}
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2.5">
              <Calendar className="size-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">Date</div>
                <div className="truncate text-sm font-semibold text-white">{todayLabel()}</div>
              </div>
            </div>

            {/* Guests stepper */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-3 py-2.5 sm:justify-start">
              <div className="flex items-center gap-2">
                <Users className="size-4 shrink-0 text-amber-400" />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">Personnes</div>
                  <div className="text-sm font-semibold text-white">{guests}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white"
                >
                  –
                </button>
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.min(20, g + 1))}
                  className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slots — horizontal carousel */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <Clock className="size-3 text-amber-400/70" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Créneau</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={cn(
                      'snap-start shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all duration-150',
                      slot === s
                        ? 'border-amber-400/60 bg-amber-400/15 text-amber-300 shadow-[0_2px_12px_rgba(245,158,11,0.25)]'
                        : 'border-white/[0.07] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/90'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => setTrouverOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.32)] transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <Search className="size-4" />
              Trouver
            </button>
          </div>

          {/* Search input */}
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
            <Search className="size-4 shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un restaurant, une ville…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="bg-[#0B0B0C] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          {/* "Réserver ce soir" rail */}
          {featuredSlot.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <h2 className="font-serif text-lg font-bold text-white sm:text-xl">
                  Disponibles {slot} ce soir
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredSlot.map((v) => (
                  <RestaurantCard key={v._id} venue={v} slot={slot} />
                ))}
              </div>
            </div>
          )}

          {/* Main grid */}
          <h2 className="mb-4 font-serif text-lg font-bold text-white sm:text-xl">
            Tous les restaurants
          </h2>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0C0C0C]">
                  <div className="aspect-[4/3] bg-white/[0.04]" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 rounded bg-white/[0.05]" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : rest.length === 0 && featuredSlot.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <UtensilsCrossed className="size-12 text-neutral-700" />
              <h3 className="text-base font-semibold text-neutral-400">Aucun restaurant trouvé</h3>
              <p className="max-w-xs text-sm text-neutral-600">
                Essayez de retirer un filtre ou changez de cuisine.
              </p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-sm font-semibold text-amber-400 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((v) => (
                <RestaurantCard key={v._id} venue={v as Venue & { rating?: number }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Trouver modal ── */}
      <AnimatePresence>
        {trouverOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTrouverOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative z-10 w-full max-w-lg max-h-[92dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold mb-0.5">
                    Trouver une table
                  </div>
                  <p className="text-sm text-neutral-500">
                    {todayLabel()} · {guests} pers. · {slot}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrouverOpen(false)}
                  aria-label="Fermer"
                  className="shrink-0 flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {venues.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <UtensilsCrossed className="size-10 text-neutral-700" />
                    <p className="text-sm text-neutral-500">Aucun restaurant trouvé</p>
                  </div>
                ) : (
                  venues.map((v) => (
                    <RestaurantCard key={v._id} venue={v as Venue & { rating?: number }} />
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
