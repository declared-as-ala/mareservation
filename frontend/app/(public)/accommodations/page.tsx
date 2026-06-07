'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Search,
  SlidersHorizontal,
  X,
  Wifi,
  Waves,
  Car,
  Sparkles,
  Star,
  MapPin,
  ChevronDown,
  Video,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { HotelCard } from '@/components/hotel/HotelCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// ── Constants ───────────────────────────────────────────────────────────────

const REGIONS = [
  'Tunis', 'Ariana', 'Ben Arous', 'Nabeul', 'Sousse', 'Monastir',
  'Mahdia', 'Sfax', 'Gabès', 'Djerba', 'Tozeur', 'Kairouan',
  'Bizerte', 'Béja', 'Jendouba', 'Hammamet', 'Tabarka',
];

const PRICE_RANGES = [
  { label: 'Tous les prix', min: undefined, max: undefined },
  { label: "Jusqu'à 200 DT", min: undefined, max: 200 },
  { label: '200 – 500 DT', min: 200, max: 500 },
  { label: '500 – 1000 DT', min: 500, max: 1000 },
  { label: '1000 DT+', min: 1000, max: undefined },
];

const STAR_OPTIONS = [
  { label: 'Tous', value: 0 },
  { label: '3★+', value: 3 },
  { label: '4★+', value: 4 },
  { label: '5★', value: 5 },
];

const AMENITY_FILTERS = [
  { key: 'piscine', label: 'Piscine', icon: <Waves className="size-3.5" /> },
  { key: 'wifi', label: 'Wi-Fi', icon: <Wifi className="size-3.5" /> },
  { key: 'parking', label: 'Parking', icon: <Car className="size-3.5" /> },
  { key: 'spa', label: 'Spa', icon: <Sparkles className="size-3.5" /> },
];

const SORT_OPTIONS = [
  { value: 'default', label: 'Recommandés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'rating_desc', label: 'Mieux notés' },
];

// ── Skeleton card ───────────────────────────────────────────────────────────

function HotelCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0C0C0C] overflow-hidden animate-pulse">
      <div className="aspect-[3/2] bg-white/[0.04]" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-white/[0.05]" />
        <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="size-7 rounded-lg bg-white/[0.04]" />
          ))}
        </div>
        <div className="flex justify-between items-end pt-2">
          <div className="space-y-1">
            <div className="h-2 w-16 rounded bg-white/[0.04]" />
            <div className="h-5 w-28 rounded bg-white/[0.05]" />
          </div>
          <div className="h-7 w-16 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

// ── Filter helpers ──────────────────────────────────────────────────────────

function filterAndSort(
  hotels: Venue[],
  opts: {
    q: string;
    governorate: string;
    priceIdx: number;
    stars: number;
    amenities: string[];
    virtualTour: boolean;
    freeCancellation: boolean;
    immersive360: boolean;
    sort: string;
  }
): Venue[] {
  let result = hotels.filter(Boolean);

  if (opts.q) {
    const lower = opts.q.toLowerCase();
    result = result.filter(
      (h) =>
        h.name.toLowerCase().includes(lower) ||
        h.city?.toLowerCase().includes(lower) ||
        h.description?.toLowerCase().includes(lower)
    );
  }
  if (opts.governorate && opts.governorate !== '__all__') {
    const lower = opts.governorate.toLowerCase();
    result = result.filter(
      (h) =>
        h.city?.toLowerCase().includes(lower) ||
        h.governorate?.toLowerCase().includes(lower)
    );
  }
  if (opts.priceIdx > 0) {
    const range = PRICE_RANGES[opts.priceIdx];
    if (range.min != null) result = result.filter((h) => (h.startingPrice ?? 0) >= range.min!);
    if (range.max != null) result = result.filter((h) => (h.startingPrice ?? 0) <= range.max!);
  }
  if (opts.stars > 0) {
    result = result.filter((h) => {
      const s = h.stars;
      if (s == null) return true; // don't exclude venues without stars data
      return s >= opts.stars;
    });
  }
  if (opts.amenities.length > 0) {
    result = result.filter((h) =>
      opts.amenities.every((a) => {
        const desc = (h.description ?? '').toLowerCase();
        return desc.includes(a);
      })
    );
  }
  if (opts.virtualTour) {
    result = result.filter((h) => h.hasVirtualTour);
  }
  if (opts.freeCancellation) {
    result = result.filter((h) => {
      if (!h.cancellationPolicy) return true; // don't exclude if field absent
      const pol = h.cancellationPolicy.toLowerCase();
      return pol.includes('gratuite') || pol.includes('annulation') || pol.includes('gratuit');
    });
  }
  if (opts.immersive360) {
    result = result.filter(
      (h) =>
        h.immersiveType === 'view-360' ||
        h.immersiveType === 'virtual-tour'
    );
  }

  switch (opts.sort) {
    case 'price_asc':
      result.sort((a, b) => (a.startingPrice ?? 0) - (b.startingPrice ?? 0));
      break;
    case 'price_desc':
      result.sort((a, b) => (b.startingPrice ?? 0) - (a.startingPrice ?? 0));
      break;
    case 'rating_desc':
      result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      break;
    default:
      result.sort((a, b) =>
        (b.isVedette ? 2 : b.isFeatured ? 1 : 0) - (a.isVedette ? 2 : a.isFeatured ? 1 : 0)
      );
  }

  return result;
}

// ── Filter panel (shared) ───────────────────────────────────────────────────

interface FilterPanelProps {
  q: string;
  onQ: (v: string) => void;
  governorate: string;
  onGovernorate: (v: string) => void;
  priceIdx: number;
  onPriceIdx: (n: number) => void;
  stars: number;
  onStars: (n: number) => void;
  typeFilter: string | null;
  onTypeFilter: (v: string | null) => void;
  sort: string;
  onSort: (v: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}

function FilterPanel({
  q, onQ, governorate, onGovernorate,
  priceIdx, onPriceIdx, stars, onStars,
  typeFilter, onTypeFilter,
  sort, onSort, onClear, hasFilters,
}: FilterPanelProps) {
  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
        <input
          type="text"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Nom d'hôtel, ville..."
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
        />
      </div>

      {/* Region */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Région
        </label>
        <Select value={governorate} onValueChange={onGovernorate}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-neutral-300 rounded-xl">
            <SelectValue placeholder="Toutes les régions" />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-white/[0.08]">
            <SelectItem value="__all__">Toutes les régions</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price range */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Prix par nuit
        </label>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPriceIdx(i)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                priceIdx === i
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                  : 'border-white/[0.07] bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stars */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Catégorie
        </label>
        <div className="flex gap-2">
          {STAR_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStars(s.value)}
              className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                stars === s.value
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                  : 'border-white/[0.07] bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-300'
              }`}
            >
              {s.value > 0 && <Star className="size-3 fill-current" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter (Hôtel / Maison d'hôte) */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Type d&apos;hébergement
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'HOTEL', label: 'Hôtels' },
            { key: 'MAISON_DHOTE', label: "Maisons d'hôte" },
          ].map((opt) => {
            const active = (typeFilter ?? 'all') === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onTypeFilter(opt.key === 'all' ? null : opt.key)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                    : 'border-white/[0.07] bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="w-full gap-1.5 text-neutral-600 hover:text-neutral-400"
        >
          <X className="size-3.5" />
          Effacer les filtres
        </Button>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function HotelsPage() {
  const [q, setQ] = useState('');
  const [governorate, setGovernorate] = useState('__all__');
  const [priceIdx, setPriceIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sort, setSort] = useState('default');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Legacy filter values kept as constants so the existing filterAndSort signature stays stable
  const amenities: string[] = [];
  const virtualTour = false;
  const freeCancellation = false;
  const immersive360 = false;

  const hasFilters =
    q !== '' ||
    governorate !== '__all__' ||
    priceIdx !== 0 ||
    stars !== 0 ||
    !!typeFilter;

  function clearFilters() {
    setQ('');
    setGovernorate('__all__');
    setPriceIdx(0);
    setStars(0);
    setTypeFilter(null);
    setSort('default');
  }

  // Fetch hotels + maisons d'hôte in parallel and merge
  const { data: hotelsRaw = [], isLoading: hotelsLoading, error: hotelsError, refetch: refetchHotels } = useQuery({
    queryKey: ['venues', 'HOTEL'],
    queryFn: () => fetchVenues({ type: 'HOTEL' }),
  });
  const { data: maisonsRaw = [], isLoading: maisonsLoading } = useQuery({
    queryKey: ['venues', 'MAISON_DHOTE'],
    queryFn: () => fetchVenues({ type: 'MAISON_DHOTE' }),
  });
  const raw = useMemo(() => [...hotelsRaw, ...maisonsRaw], [hotelsRaw, maisonsRaw]);
  const isLoading = hotelsLoading || maisonsLoading;
  const error = hotelsError;
  const refetch = refetchHotels;

  const hotels = useMemo(() => {
    const filtered = filterAndSort(raw, { q, governorate, priceIdx, stars, amenities, virtualTour, freeCancellation, immersive360, sort });
    return typeFilter ? filtered.filter((v) => v.type === typeFilter) : filtered;
  }, [raw, q, governorate, priceIdx, stars, sort, typeFilter]);

  const filterProps = {
    q, onQ: setQ,
    governorate, onGovernorate: setGovernorate,
    priceIdx, onPriceIdx: setPriceIdx,
    stars, onStars: setStars,
    typeFilter, onTypeFilter: setTypeFilter,
    sort, onSort: setSort,
    onClear: clearFilters,
    hasFilters,
  };

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#080808] to-[#080808]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(251,191,36,0.08),transparent)]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 text-center">
          {/* Back button */}
          <div className="absolute left-4 top-6 sm:left-8 sm:top-8">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </button>
          </div>

          {/* Pre-heading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400"
          >
            <Building2 className="size-3.5" />
            Hôtels & Séjours de luxe
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Trouvez votre{' '}
            <span className="text-amber-400">hébergement idéal</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mx-auto mt-5 max-w-lg text-base text-neutral-400 leading-relaxed"
          >
            Hôtels de luxe, suites panoramiques, villas privées — explorez et réservez votre chambre en quelques clics.
          </motion.p>

          {/* Quick search bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1.5 backdrop-blur-md"
          >
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Hôtel, ville, région..."
                className="w-full rounded-xl bg-transparent py-2.5 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition-all shadow-lg shadow-amber-400/20"
            >
              <Search className="size-4" />
              Rechercher
            </button>
          </motion.div>
        </div>

      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-8">

          {/* ── Sidebar filters (desktop) ── */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 rounded-2xl border border-white/[0.07] bg-[#0C0C0C] p-5">
              <h2 className="mb-5 text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-amber-400" />
                Filtres
              </h2>
              <FilterPanel {...filterProps} />
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">
            {/* Inline mobile type-pill row — always visible, no sheet click needed */}
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'HOTEL', label: 'Hôtels' },
                { key: 'MAISON_DHOTE', label: "Maisons d'hôte" },
              ].map((opt) => {
                const active = (typeFilter ?? 'all') === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTypeFilter(opt.key === 'all' ? null : opt.key)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? 'border-amber-400/60 bg-amber-400/[0.12] text-amber-300 shadow-[0_4px_18px_rgba(245,158,11,0.25)]'
                        : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-neutral-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                {/* Mobile filter trigger */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden gap-1.5 border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white"
                    >
                      <SlidersHorizontal className="size-4" />
                      Filtres
                      {hasFilters && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                          !
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto bg-[#0C0C0C] border-white/[0.08]">
                    <SheetHeader>
                      <SheetTitle className="text-neutral-200">Filtres</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 pb-6">
                      <FilterPanel {...filterProps} />
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-sm text-neutral-500">
                  {isLoading ? (
                    <span className="animate-pulse">Chargement...</span>
                  ) : (
                    <>{hotels.length} hôtel{hotels.length !== 1 ? 's' : ''} trouvé{hotels.length !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>

              {/* Sort */}
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-auto min-w-[160px] border-white/[0.08] bg-white/[0.03] text-neutral-400 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/[0.08]">
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
                {q && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/5 px-3 py-1 text-xs text-amber-400">
                    «{q}»
                    <button type="button" onClick={() => setQ('')} aria-label="Retirer">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {governorate !== '__all__' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-neutral-400">
                    <MapPin className="size-3" />
                    {governorate}
                    <button type="button" onClick={() => setGovernorate('__all__')} aria-label="Retirer">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {priceIdx > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-neutral-400">
                    {PRICE_RANGES[priceIdx].label}
                    <button type="button" onClick={() => setPriceIdx(0)} aria-label="Retirer">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {stars > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/5 px-3 py-1 text-xs text-amber-400">
                    <Star className="size-3 fill-current" />
                    {stars}★+
                    <button type="button" onClick={() => setStars(0)} aria-label="Retirer">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {typeFilter && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/5 px-3 py-1 text-xs text-amber-400">
                    {typeFilter === 'HOTEL' ? 'Hôtels' : "Maisons d'hôte"}
                    <button type="button" onClick={() => setTypeFilter(null)} aria-label="Retirer">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <HotelCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Building2 className="size-12 text-neutral-700" />
                <p className="text-neutral-500">Erreur lors du chargement des hôtels.</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            ) : hotels.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Building2 className="size-14 text-neutral-700" />
                <h3 className="text-lg font-semibold text-neutral-300">
                  {hasFilters ? 'Aucun hôtel ne correspond' : 'Aucun hôtel disponible'}
                </h3>
                <p className="max-w-sm text-sm text-neutral-600">
                  {hasFilters
                    ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                    : 'Revenez bientôt pour découvrir nos hôtels partenaires.'}
                </p>
                {hasFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="gap-1.5 border-amber-400/20 text-amber-400 hover:bg-amber-400/5"
                  >
                    <X className="size-3.5" />
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {hotels.map((hotel, i) => (
                    <motion.div
                      key={hotel._id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                    >
                      <HotelCard venue={hotel} />
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
