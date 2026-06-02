'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Coffee,
  Wifi,
  Plug,
  Trees,
  Cloud,
  Laptop,
  Mountain,
  Sunset,
  Leaf,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { CafeCard } from '@/components/cards/CafeCard';
import { cn } from '@/lib/utils';

const VIBES = [
  { key: 'all', label: 'Tous', Icon: Coffee, accent: 'from-amber-400/15 to-amber-600/5' },
  { key: 'travail', label: 'À travailler', Icon: Laptop, accent: 'from-blue-400/15 to-blue-600/5' },
  { key: 'brunch', label: 'Brunch', Icon: Sunset, accent: 'from-pink-400/15 to-pink-600/5' },
  { key: 'rooftop', label: 'Rooftop', Icon: Cloud, accent: 'from-emerald-400/15 to-emerald-600/5' },
  { key: 'plage', label: 'Plage', Icon: Mountain, accent: 'from-cyan-400/15 to-cyan-600/5' },
  { key: 'salon-de-the', label: 'Salon de thé', Icon: Leaf, accent: 'from-amber-300/15 to-orange-500/5' },
];

const FILTERS = [
  { key: 'wifi', label: 'Wi-Fi', Icon: Wifi },
  { key: 'prises', label: 'Prises', Icon: Plug },
  { key: 'terrasse', label: 'Terrasse', Icon: Trees },
  { key: 'ouvert', label: 'Ouvert maintenant', Icon: Coffee },
];

export default function CafesPage() {
  const [search, setSearch] = useState('');
  const [vibe, setVibe] = useState('all');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['cafes', search],
    queryFn: () => fetchVenues({ type: 'CAFE', q: search || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    return venues.filter((v) => {
      const tags = (v.amenities ?? []).map((t) => t.toLowerCase());
      if (vibe !== 'all' && !tags.includes(vibe)) return false;
      for (const f of activeFilters) {
        if (f === 'ouvert') continue;
        if (!tags.includes(f)) return false;
      }
      return true;
    });
  }, [venues, vibe, activeFilters]);

  function toggleFilter(key: string) {
    const next = new Set(activeFilters);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setActiveFilters(next);
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#0f0d09] to-[#0B0B0C] px-4 py-7 sm:px-6 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-10 h-56 w-56 rounded-full bg-amber-500/[0.07] blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-amber-600/[0.05] blur-[90px]" />

        <div className="relative mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/[0.08] px-2.5 py-1">
            <Coffee className="size-3 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Cafés</span>
          </span>
          <h1 className="mt-4 font-serif text-3xl font-black leading-[1.04] tracking-tight text-white sm:text-4xl md:text-5xl">
            Trouvez votre{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              spot
            </span>{' '}
            préféré.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Travailler, bruncher, prendre l&apos;air en rooftop — les meilleures adresses pour chaque humeur.
          </p>

          {/* Search */}
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111111] px-3.5 py-2.5">
            <Search className="size-4 shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Café, ville, quartier…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Vibe tabs */}
      <section className="border-b border-white/[0.06] bg-[#0B0B0C] px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {VIBES.map(({ key, label, Icon, accent }) => (
              <button
                key={key}
                type="button"
                onClick={() => setVibe(key)}
                className={cn(
                  'group flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-3 transition-all duration-300',
                  vibe === key
                    ? 'border-amber-400/55 bg-amber-400/[0.10]'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                )}
              >
                <span className={cn('flex size-8 items-center justify-center rounded-xl bg-gradient-to-br', accent)}>
                  <Icon className="size-4 text-amber-400" />
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-[13px] font-bold',
                    vibe === key ? 'text-amber-200' : 'text-white/80'
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Quick filters */}
      <section className="border-b border-white/[0.06] bg-[#0B0B0C] px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {FILTERS.map(({ key, label, Icon }) => {
              const active = activeFilters.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFilter(key)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                    active
                      ? 'border-amber-400/55 bg-amber-400/[0.10] text-amber-300'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilters(new Set())}
                className="inline-flex shrink-0 items-center text-[11px] font-semibold text-neutral-500 hover:text-amber-400"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-[#0B0B0C] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 font-serif text-lg font-bold text-white sm:text-xl">
            {filtered.length} café{filtered.length > 1 ? 's' : ''} à découvrir
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Coffee className="size-12 text-neutral-700" />
              <h3 className="text-base font-semibold text-neutral-400">Aucun café trouvé</h3>
              <p className="max-w-xs text-sm text-neutral-600">
                Essayez de changer de vibe ou de retirer un filtre.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((v) => (
                <CafeCard key={v._id} venue={v as Venue & { rating?: number }} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
