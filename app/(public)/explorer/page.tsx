'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { fetchPublicCategories } from '@/lib/api/admin';
import { VenueCard } from '@/components/cards/VenueCard';
import { VenueCardSkeleton } from '@/components/shared/skeletons';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Search,
  Coffee,
  Wine,
  Utensils,
  Music2,
  Hotel,
  Waves,
  Flower2,
  PartyPopper,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Compass,
  BriefcaseBusiness,
} from 'lucide-react';

function isValidVenueItem(value: unknown): value is {
  _id: string;
  slug?: string;
  name?: string;
  city?: string;
  isFeatured?: boolean;
  isVedette?: boolean;
} {
  return !!value && typeof value === 'object' && typeof (value as { _id?: unknown })._id === 'string';
}

type CategoryPill = { key: string; label: string; icon: typeof LayoutGrid; type?: string; q?: string };

const CATEGORIES: CategoryPill[] = [
  { key: 'all', label: 'Tous les lieux', icon: LayoutGrid },
  { key: 'cafes', label: 'Cafés & Lounges', icon: Coffee, type: 'CAFE' },
  { key: 'bars', label: 'Bars & Rooftops', icon: Wine, q: 'Bar' },
  { key: 'restaurants', label: 'Restaurants Gastronomiques', icon: Utensils, type: 'RESTAURANT' },
  { key: 'coworking', label: 'Coworking Spaces', icon: BriefcaseBusiness, type: 'COWORKING' },
  { key: 'clubs', label: 'Clubs & Resto de Nuit', icon: Music2, q: 'Club' },
  { key: 'salles', label: 'Salles & Événementiel', icon: PartyPopper, type: 'EVENT_SPACE' },
  { key: 'hotels', label: 'Hôtels & Resorts', icon: Hotel, type: 'HOTEL' },
  { key: 'beach', label: 'Beach Clubs', icon: Waves, q: 'Beach' },
  { key: 'spas', label: 'Spas & Bien-être', icon: Flower2, q: 'Spa' },
];

const CITIES = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Nabeul', 'Monastir'];

function ExplorerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') ?? '');
  const [showFilters, setShowFilters] = useState(false);

  const type = searchParams.get('type') ?? '';
  const city = searchParams.get('city') ?? '';
  const q = searchParams.get('q') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const sort = searchParams.get('sort') ?? 'featured';
  const isFeaturedFilter = searchParams.get('isFeatured') === 'true';
  const isVedetteFilter = searchParams.get('isVedette') === 'true';

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const { data: categories = [] } = useQuery({
    queryKey: ['public-categories'],
    queryFn: fetchPublicCategories,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawVenues = [], isLoading, error, refetch } = useQuery({
    queryKey: ['venues', type, city, q, categoryId, isFeaturedFilter, isVedetteFilter],
    queryFn: () =>
      fetchVenues({
        type: type || undefined,
        city: city || undefined,
        q: q || undefined,
        categoryId: categoryId || undefined,
        isFeatured: isFeaturedFilter || undefined,
        isVedette: isVedetteFilter || undefined,
      }),
  });

  const safeVenues = Array.isArray(rawVenues) ? rawVenues.filter(isValidVenueItem) : [];
  const venues = [...safeVenues].sort((a, b) => {
    if (sort === 'name_asc') return String(a.name ?? '').localeCompare(String(b.name ?? ''));
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

  const activeFiltersCount = [type, city, q, categoryId, isFeaturedFilter ? '1' : '', isVedetteFilter ? '1' : '', sort !== 'featured' ? sort : ''].filter(Boolean).length;
  const activeCategory =
    CATEGORIES.find((c) => (c.type && c.type === type) || (c.q && c.q === q && !type)) ??
    (type || q ? undefined : CATEGORIES[0]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-1.5 text-xs font-medium text-amber-400 mb-5">
            <Compass className="size-3.5" />
            Découvrir des lieux
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Explorer les lieux
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto mb-8">
            Cafés, restaurants, hôtels, cinémas — trouvez et réservez en quelques clics.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Rechercher un lieu, café, restaurant..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/60 pl-11 pr-28 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/60 focus:bg-zinc-800 transition-all backdrop-blur-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold px-4 py-2 transition-colors"
              >
                Chercher
              </button>
              {localSearch && (
                <button
                  type="button"
                  onClick={() => { setLocalSearch(''); updateParams({ q: '' }); }}
                  className="absolute right-20 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-[64px] z-30 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4">
          {/* Category pills (mirrors home page categories) */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            {/* "Filtres" button and "Effacer" link at the far left */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFilters((o) => !o)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-150',
                  showFilters
                    ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-850 hover:border-zinc-600 hover:text-zinc-100'
                )}
              >
                <SlidersHorizontal className="size-3.5" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="size-4 rounded-full bg-[#171717] text-amber-400 text-[9px] font-black flex items-center justify-center border border-amber-400/30">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setLocalSearch(''); router.push(pathname, { scroll: false }); }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  title="Effacer tous les filtres"
                >
                  <X className="size-3" />
                  <span className="hidden sm:inline">Effacer</span>
                </button>
              )}
            </div>

            {/* Elegant vertical divider */}
            <div className="h-5 w-px bg-zinc-800 shrink-0 mx-1" />

            {/* Scrollable Category pills */}
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory?.key === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setLocalSearch(cat.q ?? '');
                    updateParams({ type: cat.type ?? '', q: cat.q ?? '' });
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border whitespace-nowrap transition-all duration-150',
                    isActive
                      ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-100'
                  )}
                >
                  <Icon className="size-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="border-t border-zinc-800/60 py-4 space-y-4">
              {/* City */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                  Ville
                </p>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateParams({ city: city === c ? '' : c })}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                        city === c
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                      )}
                    >
                      <MapPin className="size-3" />
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                    Catégories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateParams({ categoryId: '' })}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                        !categoryId
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                      )}
                    >
                      Toutes
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => updateParams({ categoryId: categoryId === cat._id ? '' : cat._id })}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                          categoryId === cat._id
                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                        )}
                      >
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Tri</span>
                  <select
                    value={sort}
                    onChange={(e) => updateParams({ sort: e.target.value })}
                    className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                  >
                    <option value="featured">Vedette & mis en avant</option>
                    <option value="name_asc">Nom A-Z</option>
                    <option value="name_desc">Nom Z-A</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => updateParams({ isFeatured: isFeaturedFilter ? '' : 'true' })}
                  className={cn(
                    'min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition',
                    isFeaturedFilter
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  )}
                >
                  Lieux mis en avant
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ isVedette: isVedetteFilter ? '' : 'true' })}
                  className={cn(
                    'min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition',
                    isVedetteFilter
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  )}
                >
                  Lieux vedette
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Count + context */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {!isLoading && (
              <h2 className="text-base font-semibold text-zinc-100">
                {venues.length > 0 ? (
                  <>
                    <span className="text-amber-400">{venues.length}</span>{' '}
                    lieu{venues.length !== 1 ? 'x' : ''} trouvé{venues.length !== 1 ? 's' : ''}
                    {activeCategory && activeCategory.key !== 'all' ? ` · ${activeCategory.label}` : ''}
                    {city ? ` à ${city}` : ''}
                  </>
                ) : (
                  'Aucun résultat'
                )}
              </h2>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-zinc-500 text-sm">Une erreur est survenue.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="size-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
              <MapPin className="size-7 text-zinc-600" />
            </div>
            <p className="text-zinc-300 font-medium">Aucun lieu trouvé</p>
            <p className="text-zinc-600 text-sm max-w-xs">
              Essayez de modifier vos filtres ou de chercher un autre terme.
            </p>
            <button
              type="button"
              onClick={() => { setLocalSearch(''); router.push(pathname, { scroll: false }); }}
              className="mt-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors"
            >
              Effacer les filtres
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {venues.map((venue) => (
              <VenueCard key={venue._id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ExplorerContent />
    </Suspense>
  );
}
