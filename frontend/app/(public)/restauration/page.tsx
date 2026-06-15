'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  UtensilsCrossed,
  Coffee,
  LayoutGrid,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { CafeCard } from '@/components/cards/CafeCard';
import { DiscoverSearchBar } from '@/components/discover/DiscoverSearchBar';
import { cn } from '@/lib/utils';

type TypeFilter = 'all' | 'RESTAURANT' | 'CAFE';

const TYPE_TABS: { value: TypeFilter; label: string; Icon: typeof Coffee }[] = [
  { value: 'all', label: 'Tous', Icon: LayoutGrid },
  { value: 'RESTAURANT', label: 'Restaurants', Icon: UtensilsCrossed },
  { value: 'CAFE', label: 'Cafés', Icon: Coffee },
];

function isCafe(v: Venue) {
  return v.type === 'CAFE' || v.type === 'CAFE_LOUNGE';
}

export default function RestaurationPage() {
  const [type, setType] = useState<TypeFilter>('all');
  const [city, setCity] = useState('all');
  const [search, setSearch] = useState('');

  const restoQuery = useQuery({
    queryKey: ['venues', 'RESTAURANT'],
    queryFn: () => fetchVenues({ type: 'RESTAURANT' }),
    staleTime: 5 * 60 * 1000,
  });
  const cafeQuery = useQuery({
    queryKey: ['venues', 'CAFE'],
    queryFn: () => fetchVenues({ type: 'CAFE' }),
    staleTime: 5 * 60 * 1000,
  });
  const isLoading = restoQuery.isLoading || cafeQuery.isLoading;
  const allVenues = useMemo(
    () => [...(restoQuery.data ?? []), ...(cafeQuery.data ?? [])],
    [restoQuery.data, cafeQuery.data]
  );

  const cities = useMemo(
    () => Array.from(new Set(allVenues.map((v) => v.city).filter(Boolean))).sort(),
    [allVenues]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVenues.filter((v) => {
      if (type === 'RESTAURANT' && v.type !== 'RESTAURANT') return false;
      if (type === 'CAFE' && !isCafe(v)) return false;
      if (city !== 'all' && v.city !== city) return false;
      if (q && ![v.name, v.city, v.address, v.governorate].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allVenues, type, city, search]);

  const restaurantCount = allVenues.filter((v) => v.type === 'RESTAURANT').length;
  const cafeCount = allVenues.filter(isCafe).length;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#15110a] to-[#0B0B0C] px-4 py-6 sm:px-6 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-amber-500/[0.08] blur-[110px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-4 flex">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </Link>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/[0.08] px-2.5 py-1">
            <UtensilsCrossed className="size-3 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Restauration</span>
          </span>
          <h1 className="mt-3 font-serif text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl">
            Restaurants &amp; Cafés,{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">au même endroit.</span>
          </h1>
          <p className="mt-2.5 max-w-xl text-sm text-white/55 sm:text-base">
            Choisissez votre humeur — une table gastronomique ou un café cosy.
          </p>

          {/* Type toggle */}
          <div className="mt-6 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.07] bg-[#111111] p-1.5 sm:inline-grid sm:w-auto sm:grid-flow-col">
            {TYPE_TABS.map(({ value, label, Icon }) => {
              const active = type === value;
              const count = value === 'RESTAURANT' ? restaurantCount : value === 'CAFE' ? cafeCount : allVenues.length;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-6',
                    active ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-white/60 hover:text-white'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                  {!isLoading && (
                    <span className={cn('rounded-full px-1.5 text-[10px] font-black', active ? 'bg-black/15 text-black' : 'bg-white/10 text-white/50')}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + city filter */}
          <DiscoverSearchBar
            className="mt-3"
            search={search}
            onSearch={setSearch}
            placeholder="Rechercher un restaurant, un café, une ville…"
            city={city}
            onCity={setCity}
            cities={cities}
          />
        </div>
      </section>

      {/* ── Results ── */}
      <section className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-white sm:text-xl">
              {type === 'CAFE' ? 'Cafés' : type === 'RESTAURANT' ? 'Restaurants' : 'Restaurants & Cafés'}
            </h2>
            <span className="text-sm text-white/45">
              {filtered.length} lieu{filtered.length !== 1 ? 'x' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <UtensilsCrossed className="size-12 text-neutral-700" />
              <h3 className="text-base font-semibold text-neutral-400">Aucun lieu trouvé</h3>
              <p className="max-w-xs text-sm text-neutral-600">Essayez une autre ville ou une autre recherche.</p>
              <button
                type="button"
                onClick={() => { setCity('all'); setType('all'); }}
                className="text-sm font-semibold text-amber-400 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {filtered.map((v) =>
                isCafe(v) ? (
                  <CafeCard key={v._id} venue={v as Venue & { rating?: number }} />
                ) : (
                  <RestaurantCard key={v._id} venue={v as Venue & { rating?: number }} />
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
