'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { fetchPublicCategories } from '@/lib/api/admin';
import { getVenueHref } from '@/lib/venueHref';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import {
  MapPin, Search, Coffee, Wine, Utensils, Music2, Hotel,
  Waves, Flower2, PartyPopper, LayoutGrid, SlidersHorizontal,
  X, ArrowRight, Star, Wifi, ChevronDown, BriefcaseBusiness,
  Dumbbell, UtensilsCrossed,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
function isValidVenueItem(v: unknown): v is {
  _id: string; slug?: string; name?: string; city?: string;
  isFeatured?: boolean; isVedette?: boolean;
} {
  return !!v && typeof v === 'object' && typeof (v as { _id?: unknown })._id === 'string';
}

/* ─────────────────────────────────────────────
   Category tabs  (matching the design)
───────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'all',         label: 'Tous',              icon: LayoutGrid,      type: '',           q: '' },
  { key: 'hotels',      label: 'Hôtels',            icon: Hotel,           type: 'HOTEL',      q: '' },
  { key: 'restaurants', label: 'Restaurants',       icon: Utensils,        type: 'RESTAURANT', q: '' },
  { key: 'cafes',       label: 'Cafés',             icon: Coffee,          type: 'CAFE',       q: '' },
  { key: 'bars',        label: 'Bars & Rooftops',   icon: Wine,            type: '',           q: 'Bar' },
  { key: 'beach',       label: 'Beach Clubs',       icon: Waves,           type: '',           q: 'Beach' },
  { key: 'clubs',       label: 'Clubs',             icon: Music2,          type: '',           q: 'Club' },
  { key: 'events',      label: 'Événements',        icon: PartyPopper,     type: 'EVENT_SPACE',q: '' },
  { key: 'coworking',   label: 'Coworking',         icon: BriefcaseBusiness, type: 'COWORKING', q: '' },
  { key: 'spas',        label: 'Spas & Bien-être',  icon: Flower2,         type: '',           q: 'Spa' },
];

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Populaires' },
  { value: 'name_asc',   label: 'Nom A–Z' },
  { value: 'name_desc',  label: 'Nom Z–A' },
];

const CITIES = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Nabeul', 'Monastir', 'La Marsa', 'Hammamet'];

/* ─────────────────────────────────────────────
   Amenity icons helper
───────────────────────────────────────────── */
const AMENITY_MAP: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pool:      { label: 'Piscine',   Icon: Waves },
  spa:       { label: 'Spa',       Icon: Flower2 },
  wifi:      { label: 'Wi-Fi',     Icon: Wifi },
  breakfast: { label: 'Petit-déj.', Icon: Coffee },
  gym:       { label: 'Fitness',   Icon: Dumbbell },
  restaurant:{ label: 'Restaurant', Icon: UtensilsCrossed },
  bar:       { label: 'Bar',       Icon: Wine },
};

function getAmenities(venue: any): { label: string; Icon: React.ComponentType<{ className?: string }> }[] {
  const type = String(venue.type || '').toUpperCase();
  const name = String(venue.name || '').toLowerCase();

  // Derive from type
  const list: string[] = ['wifi'];
  if (type === 'HOTEL') list.push('pool', 'spa', 'breakfast');
  else if (type === 'RESTAURANT') list.push('breakfast', 'restaurant', 'bar');
  else if (type === 'CAFE') list.push('breakfast', 'restaurant');
  else if (name.includes('spa') || name.includes('bien')) list.push('spa', 'pool', 'gym');
  else if (name.includes('beach')) list.push('pool', 'bar');

  // Use real amenities if provided
  if (Array.isArray(venue.amenities) && venue.amenities.length > 0) {
    return venue.amenities
      .slice(0, 4)
      .map((a: string) => AMENITY_MAP[a.toLowerCase()] ?? { label: a, Icon: Star });
  }

  return list.slice(0, 4).map((k) => AMENITY_MAP[k]).filter(Boolean);
}

/* ─────────────────────────────────────────────
   Hero background images per category
───────────────────────────────────────────── */
const HERO_IMAGES: Record<string, string> = {
  all:         'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=90&w=1600&auto=format&fit=crop',
  hotels:      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=90&w=1600&auto=format&fit=crop',
  restaurants: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=90&w=1600&auto=format&fit=crop',
  cafes:       'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=90&w=1600&auto=format&fit=crop',
  bars:        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=90&w=1600&auto=format&fit=crop',
  beach:       'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=90&w=1600&auto=format&fit=crop',
  clubs:       'https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?q=90&w=1600&auto=format&fit=crop',
  spas:        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=90&w=1600&auto=format&fit=crop',
};

const HERO_COPY: Record<string, { eyebrow: string; h1a: string; h1b: string; h1c: string; sub: string }> = {
  all:         { eyebrow: 'Exploration', h1a: 'Des expériences', h1b: "d'exception,", h1c: 'à vivre en 360°.', sub: 'Cafés, restaurants, hôtels et événements — explorez chaque lieu avant de réserver.' },
  hotels:      { eyebrow: 'Hébergement', h1a: 'Des séjours', h1b: "d'exception,", h1c: 'à vivre en 360°.', sub: 'Découvrez des hôtels et maisons d\'hôtes triés sur le volet, et explorez chaque détail avant de réserver.' },
  restaurants: { eyebrow: 'Restauration', h1a: 'Des saveurs', h1b: 'inoubliables,', h1c: 'à savourer en 360°.', sub: 'Explorez les plus belles tables de Tunisie et réservez votre emplacement idéal.' },
  cafes:       { eyebrow: 'Cafés & Salons', h1a: 'Des instants', h1b: 'de douceur,', h1c: 'à vivre en 360°.', sub: 'Trouvez votre café ou salon de thé idéal et réservez votre table en quelques secondes.' },
};

/* ─────────────────────────────────────────────
   Explorer Content
───────────────────────────────────────────── */
function ExplorerContent() {
  const router    = useRouter();
  const pathname  = usePathname();
  const sp        = useSearchParams();

  const [localSearch, setLocalSearch] = useState(sp.get('q') ?? '');
  const [showFilters, setShowFilters]   = useState(false);

  const type            = sp.get('type')       ?? '';
  const city            = sp.get('city')       ?? '';
  const q               = sp.get('q')          ?? '';
  const categoryId      = sp.get('categoryId') ?? '';
  const sort            = sp.get('sort')       ?? 'featured';
  const isFeaturedFilter = sp.get('isFeatured') === 'true';
  const isVedetteFilter  = sp.get('isVedette')  === 'true';

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(sp.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v); else params.delete(k);
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, sp]
  );

  /* ─ Detect active category ─ */
  const activeCat =
    CATEGORIES.find((c) => (c.type && c.type === type) || (c.q && c.q === q && !type)) ??
    (type || q ? undefined : CATEGORIES[0]);

  const heroCopy = HERO_COPY[activeCat?.key ?? 'all'] ?? HERO_COPY.all;
  const heroBg   = HERO_IMAGES[activeCat?.key ?? 'all'] ?? HERO_IMAGES.all;

  /* ─ Data ─ */
  const { data: categories = [] } = useQuery({
    queryKey: ['public-categories'],
    queryFn: fetchPublicCategories,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawVenues = [], isLoading, error, refetch } = useQuery({
    queryKey: ['venues', type, city, q, categoryId, isFeaturedFilter, isVedetteFilter],
    queryFn: () => fetchVenues({
      type: type || undefined, city: city || undefined, q: q || undefined,
      categoryId: categoryId || undefined,
      isFeatured: isFeaturedFilter || undefined,
      isVedette: isVedetteFilter || undefined,
    }),
  });

  const safeVenues = Array.isArray(rawVenues) ? rawVenues.filter(isValidVenueItem) : [];
  const venues = [...safeVenues].sort((a, b) => {
    if (sort === 'name_asc')  return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    if (sort === 'name_desc') return String(b.name ?? '').localeCompare(String(a.name ?? ''));
    if (a.isVedette && !b.isVedette) return -1;
    if (!a.isVedette && b.isVedette) return 1;
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return 0;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: localSearch.trim() });
  };

  const activeFiltersCount = [type, city, q, categoryId,
    isFeaturedFilter ? '1' : '', isVedetteFilter ? '1' : '',
    sort !== 'featured' ? sort : '',
  ].filter(Boolean).length;

  /* ──────────────────────────── RENDER ──────────────────────────── */
  return (
    <div className="min-h-screen bg-[#090909] text-white">

      {/* ════════════════════════════════════════
          HERO  — cinematic full-bleed with image
          ════════════════════════════════════════ */}
      <div className="relative h-[320px] overflow-hidden sm:h-[380px] md:h-[420px]">
        {/* Background image */}
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-8 sm:px-8 md:px-12">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5">
              <span className="text-amber-400">✦</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
                {heroCopy.eyebrow}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-3xl font-black leading-[1.08] text-white sm:text-4xl md:text-5xl">
              {heroCopy.h1a}{' '}
              <span className="text-amber-400">{heroCopy.h1b}</span>
              <br />
              {heroCopy.h1c}
            </h1>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
              {heroCopy.sub}
            </p>

            {/* CTA + Search bar */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => updateParams({ type: 'HOTEL', q: '' })}
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-amber-300 active:scale-95"
              >
                <span>✦</span>
                Visite immersive 360°
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* 360° orb — desktop only */}
          <div className="absolute bottom-8 right-8 hidden items-center justify-center md:flex">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute h-28 w-28 rounded-full border border-amber-400/20 animate-[spin_20s_linear_infinite]" />
              <div className="absolute h-20 w-20 rounded-full border border-amber-400/15 animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute h-28 w-28 rounded-full bg-amber-500/10 blur-[20px]" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-black/50 backdrop-blur-md">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-20">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#fbbf24" strokeWidth="1" />
                  <ellipse cx="50" cy="50" rx="30" ry="46" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
                  <ellipse cx="50" cy="50" rx="46" ry="20" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
                  <line x1="4" y1="50" x2="96" y2="50" stroke="#fbbf24" strokeWidth="0.8" />
                </svg>
                <span className="relative font-serif text-2xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                  360°
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          SEARCH BAR
          ════════════════════════════════════════ */}
      <div className="border-b border-white/[0.06] bg-[#0d0d0d] px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Rechercher un lieu, café, restaurant, ville..."
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-28 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.06] transition-all"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => { setLocalSearch(''); updateParams({ q: '' }); }}
                className="absolute right-24 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold px-4 py-2 transition-colors"
            >
              Chercher
            </button>
          </form>
        </div>
      </div>

      {/* ════════════════════════════════════════
          CATEGORY TABS
          ════════════════════════════════════════ */}
      <div className="sticky top-[76px] sm:top-[84px] lg:top-[88px] z-30 border-b border-white/[0.05] bg-[#0d0d0d]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex items-center gap-2.5 py-3.5 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCat?.key === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setLocalSearch(cat.q ?? '');
                    updateParams({ type: cat.type ?? '', q: cat.q ?? '' });
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap border transition-all duration-200',
                    isActive
                      ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20'
                      : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.07]'
                  )}
                >
                  <Icon className="size-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          FILTER ROW
          ════════════════════════════════════════ */}
      <div className="border-b border-white/[0.04] bg-[#090909] px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3 py-3">
            {/* Left: filter + count */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((o) => !o)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all',
                  showFilters
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:border-amber-400/40'
                )}
              >
                <SlidersHorizontal className="size-3.5" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-black/30 text-[9px] font-black">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {!isLoading && (
                <span className="text-xs text-zinc-600">
                  {venues.length} établissement{venues.length !== 1 ? 's' : ''} trouvé{venues.length !== 1 ? 's' : ''}
                </span>
              )}

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setLocalSearch(''); router.push(pathname, { scroll: false }); }}
                  className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X className="size-3" /> Effacer
                </button>
              )}
            </div>

            {/* Right: sort */}
            <div className="relative flex items-center gap-2">
              <span className="text-xs text-zinc-600 hidden sm:inline">Trier par</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => updateParams({ sort: e.target.value })}
                  className="appearance-none rounded-full border border-white/[0.08] bg-white/[0.04] py-2 pl-3 pr-8 text-xs text-zinc-300 focus:outline-none focus:border-amber-400/40 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
              </div>
            </div>
          </div>

          {/* ── Expanded filter panel ── */}
          {showFilters && (
            <div className="border-t border-white/[0.05] py-4 space-y-4 pb-5">
              {/* Cities */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Ville</p>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateParams({ city: city === c ? '' : c })}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        city === c
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                          : 'bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:border-white/20 hover:text-zinc-300'
                      )}
                    >
                      <MapPin className="size-3" /> {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateParams({ isFeatured: isFeaturedFilter ? '' : 'true' })}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
                    isFeaturedFilter
                      ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                      : 'bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:border-white/20 hover:text-zinc-300'
                  )}
                >
                  Mis en avant
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ isVedette: isVedetteFilter ? '' : 'true' })}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
                    isVedetteFilter
                      ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                      : 'bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:border-white/20 hover:text-zinc-300'
                  )}
                >
                  Vedette ✦
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          VENUE LIST
          ════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.03] animate-pulse">
                <div className="aspect-[4/3] w-full bg-white/[0.06]" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/3 rounded bg-white/[0.05]" />
                  <div className="h-7 w-full rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <p className="text-zinc-500 text-sm">Une erreur est survenue.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Réessayer
            </button>
          </div>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="mb-2 flex size-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <MapPin className="size-7 text-zinc-700" />
            </div>
            <p className="font-medium text-zinc-300">Aucun lieu trouvé</p>
            <p className="max-w-xs text-sm text-zinc-600">
              Essayez de modifier vos filtres ou de chercher un autre terme.
            </p>
            <button
              type="button"
              onClick={() => { setLocalSearch(''); router.push(pathname, { scroll: false }); }}
              className="mt-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] px-4 py-2 text-sm text-zinc-300"
            >
              Effacer les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {venues.map((venue: any) => (
              <ExplorerVenueCard key={venue._id} venue={venue} />
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          BOTTOM 360° CTA BANNER
          ════════════════════════════════════════ */}
      <div className="mx-4 mb-10 overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-r from-[#0f0f0f] via-[#111111] to-[#0f0f0f] sm:mx-8">
        <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
          {/* Left: orb + text */}
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
              <div className="absolute h-14 w-14 rounded-full bg-amber-500/10 blur-[15px]" />
              <span className="relative font-serif text-lg font-black text-amber-400">360°</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Explorez chaque lieu
              </p>
              <p className="text-sm font-bold text-amber-400">
                en immersion totale.
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                Visites 360° haute définition, pour réserver en toute confiance.
              </p>
            </div>
          </div>
          {/* Right: CTA */}
          <button
            onClick={() => updateParams({ type: '', q: '' })}
            className="shrink-0 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-amber-300 active:scale-95 whitespace-nowrap"
          >
            Découvrir en 360° →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Venue type → badge label + icon
───────────────────────────────────────────── */
function getTypeMeta(venue: any): { label: string; Icon: React.ComponentType<{ className?: string }> } {
  const t = String(venue.type || '').toUpperCase();
  const n = String(venue.name || '').toLowerCase();
  if (n.includes('beach')) return { label: 'Beach Club', Icon: Waves };
  if (n.includes('rooftop') || n.includes('bar')) return { label: 'Bar', Icon: Wine };
  if (t === 'HOTEL') return { label: 'Hôtel', Icon: Hotel };
  if (t === 'RESTAURANT') return { label: 'Restaurant', Icon: Utensils };
  if (t === 'CAFE' || t === 'CAFE_LOUNGE') return { label: 'Café', Icon: Coffee };
  if (t === 'COWORKING') return { label: 'Coworking', Icon: BriefcaseBusiness };
  if (t === 'EVENT_SPACE') return { label: 'Événements', Icon: PartyPopper };
  if (n.includes('spa') || n.includes('bien')) return { label: 'Bien-être', Icon: Flower2 };
  return { label: 'Lieu', Icon: MapPin };
}

/* ─────────────────────────────────────────────
   Premium vertical venue card (responsive grid)
───────────────────────────────────────────── */
function ExplorerVenueCard({ venue }: { venue: any }) {
  const href      = getVenueHref(venue);
  const img       = venue.coverImage ?? venue.media?.find((m: any) => m.kind === 'HERO_IMAGE')?.url ?? null;
  const { label, Icon } = getTypeMeta(venue);
  const amenities = getAmenities(venue);
  // Real data only — no fabricated ratings/prices.
  const price = (venue.startingPrice as number) ?? (venue.priceRangeMin as number) ?? null;

  return (
    <a
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f0f0f] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
        {img ? (
          <img
            src={img}
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="size-9 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Category chip */}
        <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 backdrop-blur-sm">
          <Icon className="size-3 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-white">{label}</span>
        </div>

        {/* 360 + favorite */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {venue.hasVirtualTour && (
            <span className="rounded-full border border-amber-400/30 bg-black/65 px-2 py-1 text-[10px] font-black text-amber-300 backdrop-blur-sm">
              360°
            </span>
          )}
          <span className="rounded-full bg-black/55 backdrop-blur-sm">
            <FavoriteButton venueId={venue._id} size="sm" />
          </span>
        </div>

        {venue.isVedette && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
            ✦ Vedette
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-amber-100">
          {venue.name}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-amber-400/85">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{venue.city ?? 'Tunisie'}</span>
        </div>

        {/* Amenity chips */}
        {amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.slice(0, 3).map(({ label: aLabel, Icon: AIcon }) => (
              <span
                key={aLabel}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-zinc-400"
              >
                <AIcon className="size-3 text-amber-400/70" />
                {aLabel}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          {price ? (
            <div>
              <p className="text-[10px] text-zinc-600">À partir de</p>
              <p className="font-black leading-none text-amber-400">
                <span className="text-lg">{price.toLocaleString('fr-TN')}</span>
                <span className="text-xs font-bold"> TND</span>
              </p>
            </div>
          ) : (
            <span className="text-xs text-zinc-600">Réservation immédiate</span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition-all group-hover:border-amber-400 group-hover:bg-amber-400 group-hover:text-black">
            Voir <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

/* ─────────────────────────────────────────────
   Page export
───────────────────────────────────────────── */
export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090909]">
          <div className="h-[380px] animate-pulse bg-white/[0.03]" />
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.03] animate-pulse">
                  <div className="aspect-[4/3] w-full bg-white/[0.06]" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
                    <div className="h-3 w-1/3 rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ExplorerContent />
    </Suspense>
  );
}
