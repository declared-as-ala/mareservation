'use client';

import { Search, X, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared search + city filter bar used across the discovery listing pages
 * (Hébergement, Restauration, Sorties, Bien-être) so they all share one
 * premium, consistent look.
 */
export function DiscoverSearchBar({
  search,
  onSearch,
  placeholder = 'Rechercher un lieu, une ville…',
  city,
  onCity,
  cities,
  className,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  /** Omit city/onCity/cities to render only the search input. */
  city?: string;
  onCity?: (value: string) => void;
  cities?: string[];
  className?: string;
}) {
  const showCity = typeof onCity === 'function';
  return (
    <div className={cn('flex flex-col gap-2.5 sm:flex-row', className)}>
      {/* Search */}
      <div className="group flex flex-1 items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-all focus-within:border-amber-400/50 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_4px_rgba(245,158,11,0.08)]">
        <Search className="size-4 shrink-0 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            aria-label="Effacer la recherche"
            className="text-neutral-500 transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* City */}
      {showCity && (
        <div className="relative sm:w-56">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <select
            value={city ?? 'all'}
            onChange={(e) => onCity?.(e.target.value)}
            className="h-full min-h-[50px] w-full appearance-none rounded-2xl border border-white/[0.08] bg-[#161616] pl-10 pr-9 text-sm text-white outline-none transition [color-scheme:dark] focus:border-amber-400/50"
          >
            <option value="all" className="bg-[#161616] text-white">Toutes les villes</option>
            {(cities ?? []).map((c) => (
              <option key={c} value={c} className="bg-[#161616] text-white">{c}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
        </div>
      )}
    </div>
  );
}
