'use client';

import { useMemo, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Compass } from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { VenueCard } from '@/components/cards/VenueCard';
import { DiscoverSearchBar } from '@/components/discover/DiscoverSearchBar';
import { cn } from '@/lib/utils';

export interface CollectionCategory {
  value: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  /** Backend $text keywords that define this sub-category. */
  keywords: string[];
}

interface CollectionExplorerProps {
  /** Stable cache key (e.g. "sorties"). */
  cacheKey: string;
  eyebrow: string;
  badgeIcon: ComponentType<{ className?: string }>;
  titleLead: string;
  titleHighlight: string;
  subtitle: string;
  emptyLabel: string;
  /** Sub-categories (a "Tous" tab is added automatically). */
  categories: CollectionCategory[];
  /**
   * Backend venue types that belong to this collection (e.g. ['CAFE_LOUNGE']).
   * When provided, the collection lists ALL venues of these types and assigns
   * sub-categories from the keywords locally — reliable and excludes other
   * types. When omitted, falls back to keyword `$text` search.
   */
  types?: string[];
}

type Entry = { venue: Venue; cats: Set<string> };

export function CollectionExplorer({
  cacheKey,
  eyebrow,
  badgeIcon: BadgeIcon,
  titleLead,
  titleHighlight,
  subtitle,
  emptyLabel,
  categories,
  types,
}: CollectionExplorerProps) {
  const [active, setActive] = useState('all');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['collection', cacheKey, types ?? null],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const byId = new Map<string, Entry>();

      // Assign each venue to EXACTLY ONE sub-category so it never shows under
      // two tabs. Prefer a keyword found in the name, then the description/tags,
      // in the categories' declared priority order. null ⇒ shows only in "Tous".
      const assignCat = (v: Venue): string | null => {
        const name = (v.name ?? '').toLowerCase();
        const desc = `${(v as { description?: string }).description ?? ''} ${((v as { amenities?: string[] }).amenities ?? []).join(' ')}`.toLowerCase();
        for (const cat of categories) {
          if (cat.keywords.some((kw) => name.includes(kw.toLowerCase()))) return cat.value;
        }
        for (const cat of categories) {
          if (cat.keywords.some((kw) => desc.includes(kw.toLowerCase()))) return cat.value;
        }
        return null;
      };

      if (types && types.length) {
        // Type-driven: list every venue of these types (reliable, no missing /
        // mis-typed entries), then tag a single sub-category locally.
        const lists = await Promise.all(types.map((t) => fetchVenues({ type: t })));
        for (const list of lists) {
          for (const v of list) {
            if (!v?._id || byId.has(v._id)) continue;
            const cat = assignCat(v);
            byId.set(v._id, { venue: v, cats: new Set<string>(cat ? [cat] : []) });
          }
        }
      } else {
        // Keyword-driven fallback (collections without a dedicated venue type):
        // a venue keeps only its first-matched (highest-priority) category.
        const all = new Map<string, Venue>();
        await Promise.all(
          categories.flatMap((cat) =>
            cat.keywords.map(async (kw) => {
              const res = await fetchVenues({ q: kw });
              for (const v of res) if (v?._id && !all.has(v._id)) all.set(v._id, v);
            })
          )
        );
        for (const v of all.values()) {
          const cat = assignCat(v);
          byId.set(v._id, { venue: v, cats: new Set<string>(cat ? [cat] : []) });
        }
      }
      return Array.from(byId.values());
    },
  });

  const cities = useMemo(
    () => Array.from(new Set(entries.map((e) => e.venue.city).filter(Boolean))).sort(),
    [entries]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: entries.length };
    for (const cat of categories) map[cat.value] = entries.filter((e) => e.cats.has(cat.value)).length;
    return map;
  }, [entries, categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(({ venue, cats }) => {
      if (active !== 'all' && !cats.has(active)) return false;
      if (city !== 'all' && venue.city !== city) return false;
      if (q && ![venue.name, venue.city, venue.address, venue.governorate].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [entries, active, city, search]);

  const tabs: CollectionCategory[] = [
    { value: 'all', label: 'Tous', Icon: LayoutGrid, keywords: [] },
    ...categories,
  ];

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
            <BadgeIcon className="size-3 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{eyebrow}</span>
          </span>
          <h1 className="mt-3 font-serif text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl">
            {titleLead}{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">{titleHighlight}</span>
          </h1>
          <p className="mt-2.5 max-w-xl text-sm text-white/55 sm:text-base">{subtitle}</p>

          {/* Category toggle */}
          <div className="no-scrollbar mt-6 -mx-1 flex gap-1.5 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {tabs.map(({ value, label, Icon }) => {
              const isActive = active === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActive(value)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all',
                    isActive
                      ? 'border-amber-400 bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                      : 'border-white/[0.08] bg-[#111111] text-white/60 hover:border-white/20 hover:text-white'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                  {!isLoading && (
                    <span className={cn('rounded-full px-1.5 text-[10px] font-black', isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-white/50')}>
                      {counts[value] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + city */}
          <DiscoverSearchBar
            className="mt-3"
            search={search}
            onSearch={setSearch}
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
              {active === 'all' ? eyebrow : tabs.find((t) => t.value === active)?.label}
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
              <Compass className="size-12 text-neutral-700" />
              <h3 className="text-base font-semibold text-neutral-400">{emptyLabel}</h3>
              <p className="max-w-xs text-sm text-neutral-600">Essayez une autre ville ou une autre catégorie.</p>
              <button
                type="button"
                onClick={() => { setSearch(''); setCity('all'); setActive('all'); }}
                className="text-sm font-semibold text-amber-400 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {filtered.map(({ venue }) => (
                <VenueCard key={venue._id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
