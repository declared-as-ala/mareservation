'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { fetchVenues, type VenuesQuery } from '@/lib/api/venues';
import { fetchEvents, type EventsQuery } from '@/lib/api/events';
import type { Venue, Event } from '@/lib/api/types';
import { VenueCard } from '@/components/cards/VenueCard';
import { EventCard } from '@/components/cards/EventCard';
import { VenueCardSkeleton, EventCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Input } from '@/components/ui/input';
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
import { Button } from '@/components/ui/button';

const TUNISIAN_REGIONS = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Gabès', 'Djerba', 'Tozeur',
  'Kairouan', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana',
  'Zaghouan', 'Kasserine', 'Gafsa', 'Médenine', 'Tataouine', 'Kébili',
  'Sidi Bouzid',
];

interface CategoryListingPageProps {
  title: string;
  subtitle: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  mode: 'venue' | 'event';
  venueType?: string;
}

function isValidVenueItem(value: unknown): value is Venue {
  return !!value && typeof value === 'object' && typeof (value as { _id?: unknown })._id === 'string';
}

function RegionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Toutes les régions" />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-64">
        <SelectItem value="__all__">Toutes les régions</SelectItem>
        {TUNISIAN_REGIONS.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CategoryListingPage({
  title,
  subtitle,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  mode,
  venueType,
}: CategoryListingPageProps) {
  const [region, setRegion] = useState('__all__');
  const [search, setSearch] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const governorate = region === '__all__' ? undefined : region;
  const q = search.trim() || undefined;

  const venueQuery = useQuery({
    queryKey: ['venues', venueType, governorate, q],
    queryFn: () =>
      fetchVenues({
        type: venueType,
        governorate,
        q,
      } satisfies VenuesQuery),
    enabled: mode === 'venue',
  });

  const eventQuery = useQuery({
    queryKey: ['events', governorate, q],
    queryFn: () => fetchEvents({ upcoming: true } satisfies EventsQuery),
    enabled: mode === 'event',
  });

  const isLoading = mode === 'venue' ? venueQuery.isLoading : eventQuery.isLoading;
  const error = mode === 'venue' ? venueQuery.error : eventQuery.error;
  const refetch = mode === 'venue' ? venueQuery.refetch : eventQuery.refetch;

  const venues: Venue[] =
    mode === 'venue'
      ? (Array.isArray(venueQuery.data) ? venueQuery.data.filter(isValidVenueItem) : [])
      : [];
  let events: Event[] = mode === 'event' ? (eventQuery.data ?? []) : [];

  if (mode === 'event' && governorate) {
    events = events.filter((ev) => {
      const v = ev.venueId;
      if (typeof v === 'object' && v?.city) {
        return v.city.toLowerCase().includes(governorate.toLowerCase());
      }
      return true;
    });
  }

  if (mode === 'event' && q) {
    const lower = q.toLowerCase();
    events = events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(lower) ||
        ev.description?.toLowerCase().includes(lower)
    );
  }

  const itemCount = mode === 'venue' ? venues.length : events.length;
  const hasActiveFilters = region !== '__all__' || search.trim() !== '';

  function clearFilters() {
    setRegion('__all__');
    setSearch('');
  }

  const filterControls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <RegionSelect value={region} onChange={setRegion} />
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="pl-9"
        />
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
          <X className="size-3.5" />
          Effacer
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800/60 py-14 sm:py-18">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-amber-400/60" />
          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-400">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Desktop filters */}
        <div className="mb-8 hidden sm:block">{filterControls}</div>

        {/* Mobile filter trigger */}
        <div className="mb-6 sm:hidden">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <SlidersHorizontal className="size-4" />
                Filtres
                {hasActiveFilters && (
                  <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    !
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 pb-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Région</label>
                  <RegionSelect value={region} onChange={setRegion} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="flex-1"
                  >
                    Voir les résultats
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Effacer
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) =>
              mode === 'venue' ? (
                <VenueCardSkeleton key={i} />
              ) : (
                <EventCardSkeleton key={i} />
              )
            )}
          </div>
        ) : error ? (
          <ErrorState onRetry={() => refetch()} />
        ) : itemCount === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-400">
              {itemCount} résultat{itemCount !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mode === 'venue'
                ? venues.map((venue) => (
                    <VenueCard key={venue._id} venue={venue} />
                  ))
                : events.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
