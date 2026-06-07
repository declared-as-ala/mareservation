'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  UtensilsCrossed,
  Clock,
  Users,
  Calendar,
  Heart,
  Briefcase,
  Anchor,
  Music,
  Wine,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { cn } from '@/lib/utils';

// ── Cuisines ────────────────────────────────────────────────────────────────

const CUISINES = [
  { key: 'all', label: 'Toutes' },
  { key: 'tunisien', label: 'Tunisien' },
  { key: 'italien', label: 'Italien' },
  { key: 'japonais', label: 'Japonais' },
  { key: 'libanais', label: 'Libanais' },
  { key: 'steakhouse', label: 'Steakhouse' },
  { key: 'fruits-de-mer', label: 'Fruits de mer' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'végé', label: 'Végé' },
];

const AMBIENCES = [
  { key: 'romantique', label: 'Romantique', Icon: Heart },
  { key: 'famille', label: 'En famille', Icon: Users },
  { key: 'business', label: 'Business', Icon: Briefcase },
  { key: 'vue-mer', label: 'Vue mer', Icon: Anchor },
  { key: 'rooftop', label: 'Rooftop', Icon: Wine },
  { key: 'live-music', label: 'Live music', Icon: Music },
];

// ── Time slot helpers ───────────────────────────────────────────────────────

const SLOTS = ['12:00', '13:00', '19:00', '20:00', '21:00'];

function todayLabel(): string {
  return new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: '2-digit', month: 'long' });
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('all');
  const [ambience, setAmbience] = useState<string | null>(null);
  const [slot, setSlot] = useState('19:00');
  const [guests, setGuests] = useState(2);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['restaurants', search, cuisine, ambience],
    queryFn: () =>
      fetchVenues({
        type: 'RESTAURANT',
        q: search || undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Client-side filter by cuisine + ambience using amenities[]
  const filtered = useMemo(() => {
    return venues.filter((v) => {
      const tags = (v.amenities ?? []).map((t) => t.toLowerCase());
      if (cuisine !== 'all' && !tags.includes(cuisine)) return false;
      if (ambience && !tags.includes(ambience)) return false;
      return true;
    });
  }, [venues, cuisine, ambience]);

  // Split: top of result list = "Réserver ce soir" rail (first 3 with virtual tour)
  const featuredSlot = filtered.filter((v) => v.hasVirtualTour).slice(0, 3);
  const rest = filtered.filter((v) => !featuredSlot.includes(v));

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* ── Hero with Resy-style booking strip ── */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#15110a] to-[#0B0B0C] px-4 py-7 sm:px-6 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-amber-500/[0.08] blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-amber-600/[0.06] blur-[90px]" />

        <div className="relative mx-auto max-w-7xl">
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
          <div className="mt-6 grid gap-2 rounded-3xl border border-white/[0.07] bg-[#111111] p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-2 sm:p-2">
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

            {/* Slots */}
            <div className="rounded-2xl bg-white/[0.03] p-2 sm:px-2 sm:py-2.5">
              <div className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-white/40">
                Créneau
              </div>
              <div className="flex flex-wrap gap-1">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold transition-all',
                      slot === s
                        ? 'bg-amber-400 text-black shadow-[0_4px_16px_rgba(245,158,11,0.32)]'
                        : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
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

      {/* ── Cuisine filters ── */}
      <section className="border-b border-white/[0.06] bg-[#0B0B0C] px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {CUISINES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCuisine(c.key)}
                className={cn(
                  'shrink-0 snap-start rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                  cuisine === c.key
                    ? 'border-amber-400/55 bg-amber-400/[0.10] text-amber-300'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ambience tags ── */}
      <section className="border-b border-white/[0.06] bg-[#0B0B0C] px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {AMBIENCES.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setAmbience((a) => (a === key ? null : key))}
                className={cn(
                  'inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                  ambience === key
                    ? 'border-amber-400/55 bg-amber-400/[0.10] text-amber-300'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
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
            Tous les restaurants {cuisine !== 'all' && `· ${CUISINES.find((c) => c.key === cuisine)?.label}`}
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
                onClick={() => {
                  setCuisine('all');
                  setAmbience(null);
                  setSearch('');
                }}
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
    </div>
  );
}
