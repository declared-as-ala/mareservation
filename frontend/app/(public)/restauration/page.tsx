'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  X,
  UtensilsCrossed,
  Coffee,
  SlidersHorizontal,
  ScanEye,
  Star,
  MapPin,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { CafeCard } from '@/components/cards/CafeCard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type TypeFilter = 'all' | 'RESTAURANT' | 'CAFE';

const TYPE_TABS: { value: TypeFilter; label: string; Icon: typeof Coffee }[] = [
  { value: 'all', label: 'Tous', Icon: LayoutGrid },
  { value: 'RESTAURANT', label: 'Restaurants', Icon: UtensilsCrossed },
  { value: 'CAFE', label: 'Cafés', Icon: Coffee },
];

const PRICE_TIERS: { value: number; label: string }[] = [
  { value: 0, label: 'Tous' },
  { value: 1, label: '€' },
  { value: 2, label: '€€' },
  { value: 3, label: '€€€' },
];

const AMBIANCE: { key: string; label: string }[] = [
  { key: 'terrasse', label: 'Terrasse' },
  { key: 'rooftop', label: 'Rooftop' },
  { key: 'vue mer', label: 'Vue mer' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'salon de thé', label: 'Salon de thé' },
];

function isCafe(v: Venue) {
  return v.type === 'CAFE' || v.type === 'CAFE_LOUNGE';
}

function priceTier(v: Venue): number {
  const p = v.startingPrice ?? v.priceRangeMin ?? 0;
  if (!p) return 0;
  if (p < 30) return 1;
  if (p <= 70) return 2;
  return 3;
}

function hasAmenity(v: Venue, key: string) {
  return (v.amenities ?? []).some((a) => a.toLowerCase().includes(key));
}

export default function RestaurationPage() {
  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [price, setPrice] = useState(0);
  const [only360, setOnly360] = useState(false);
  const [onlyVedette, setOnlyVedette] = useState(false);
  const [ambiance, setAmbiance] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  function toggleAmbiance(key: string) {
    setAmbiance((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const activeFilterCount =
    (city !== 'all' ? 1 : 0) + (price !== 0 ? 1 : 0) + (only360 ? 1 : 0) + (onlyVedette ? 1 : 0) + ambiance.length;

  function resetFilters() {
    setCity('all');
    setPrice(0);
    setOnly360(false);
    setOnlyVedette(false);
    setAmbiance([]);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVenues.filter((v) => {
      if (type === 'RESTAURANT' && v.type !== 'RESTAURANT') return false;
      if (type === 'CAFE' && !isCafe(v)) return false;
      if (q && ![v.name, v.city, v.address, v.governorate].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))) return false;
      if (city !== 'all' && v.city !== city) return false;
      if (price !== 0 && priceTier(v) !== price) return false;
      if (only360 && !v.hasVirtualTour) return false;
      if (onlyVedette && !v.isVedette) return false;
      if (ambiance.length && !ambiance.some((key) => hasAmenity(v, key))) return false;
      return true;
    });
  }, [allVenues, type, search, city, price, only360, onlyVedette, ambiance]);

  const restaurantCount = allVenues.filter((v) => v.type === 'RESTAURANT').length;
  const cafeCount = allVenues.filter(isCafe).length;

  // ── Advanced filters body (shared by desktop bar + mobile sheet) ──
  function renderFilters() {
    return (
      <div className="space-y-5">
        {/* Ville */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/45">Ville</p>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-white/[0.08] bg-black pl-10 pr-9 text-sm text-white outline-none transition focus:border-amber-400/60"
            >
              <option value="all">Toutes les villes</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>

        {/* Prix */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/45">Budget</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PRICE_TIERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPrice(t.value)}
                className={cn(
                  'h-11 rounded-2xl border text-sm font-bold transition-all',
                  price === t.value
                    ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ambiance */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/45">Ambiance</p>
          <div className="flex flex-wrap gap-2">
            {AMBIANCE.map((a) => {
              const active = ambiance.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleAmbiance(a.key)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all',
                    active
                      ? 'border-amber-400 bg-amber-400 text-black'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/65 hover:border-white/25'
                  )}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setOnly360((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all',
              only360 ? 'border-amber-400/55 bg-amber-400/10 text-amber-300' : 'border-white/[0.08] bg-white/[0.03] text-white/75'
            )}
          >
            <span className="flex items-center gap-2"><ScanEye className="size-4" /> Avec visite 360°</span>
            <span className={cn('flex h-5 w-9 items-center rounded-full p-0.5 transition-all', only360 ? 'bg-amber-400' : 'bg-white/15')}>
              <span className={cn('size-4 rounded-full bg-black transition-transform', only360 && 'translate-x-4')} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOnlyVedette((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all',
              onlyVedette ? 'border-amber-400/55 bg-amber-400/10 text-amber-300' : 'border-white/[0.08] bg-white/[0.03] text-white/75'
            )}
          >
            <span className="flex items-center gap-2"><Star className="size-4" /> Coups de cœur</span>
            <span className={cn('flex h-5 w-9 items-center rounded-full p-0.5 transition-all', onlyVedette ? 'bg-amber-400' : 'bg-white/15')}>
              <span className={cn('size-4 rounded-full bg-black transition-transform', onlyVedette && 'translate-x-4')} />
            </span>
          </button>
        </div>
      </div>
    );
  }

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
            Choisissez votre humeur — une table gastronomique ou un café cosy — filtrez par ville, budget et ambiance.
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

          {/* Search + filters trigger */}
          <div className="mt-3 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3">
              <Search className="size-4 shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un lieu, une ville…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 focus:outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Effacer" className="text-neutral-500 hover:text-white">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-bold text-white/85 transition-all hover:border-amber-400/40 lg:hidden"
            >
              <SlidersHorizontal className="size-4" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Desktop filters sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-white/[0.07] bg-[#0E0E0F] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Filtres</h2>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="text-xs font-semibold text-amber-400 hover:underline">
                    Réinitialiser
                  </button>
                )}
              </div>
              {renderFilters()}
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-white sm:text-xl">
                {type === 'CAFE' ? 'Cafés' : type === 'RESTAURANT' ? 'Restaurants' : 'Restaurants & Cafés'}
              </h2>
              <span className="text-sm text-white/45">
                {filtered.length} lieu{filtered.length !== 1 ? 'x' : ''}
              </span>
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                <p className="max-w-xs text-sm text-neutral-600">Essayez d&apos;élargir vos filtres ou de changer de ville.</p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); resetFilters(); setType('all'); }}
                  className="text-sm font-semibold text-amber-400 hover:underline"
                >
                  Réinitialiser
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
        </div>
      </section>

      {/* ── Mobile filters sheet ── */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-white/[0.08] bg-[#0B0B0C] px-4 pb-8 text-white">
          <SheetHeader className="px-0 pb-2 pt-1 text-left">
            <SheetTitle className="flex items-center gap-2 pr-8 text-white">
              <SlidersHorizontal className="size-5 text-amber-300" />
              Filtres
            </SheetTitle>
          </SheetHeader>
          {renderFilters()}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/70"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="flex-1 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black"
            >
              Voir {filtered.length} lieu{filtered.length !== 1 ? 'x' : ''}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
