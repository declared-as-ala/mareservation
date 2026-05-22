'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { MapPin } from 'lucide-react';
import { getVenueHref } from '@/lib/venueHref';

function normalize(value: number, min: number, max: number) {
  if (min === max) return 50;
  return ((value - min) / (max - min)) * 100;
}

export default function MapPage() {
  const [type, setType] = useState('');
  const { data: venues = [] } = useQuery({
    queryKey: ['map-venues', type],
    queryFn: () => fetchVenues({ type: type || undefined }),
  });

  const positioned = useMemo(() => {
    const withCoords = venues.filter((venue) => venue.coordinates?.lat != null && venue.coordinates?.lng != null);
    const lats = withCoords.map((venue) => venue.coordinates!.lat as number);
    const lngs = withCoords.map((venue) => venue.coordinates!.lng as number);
    const minLat = Math.min(...lats, 0);
    const maxLat = Math.max(...lats, 1);
    const minLng = Math.min(...lngs, 0);
    const maxLng = Math.max(...lngs, 1);

    return withCoords.map((venue) => ({
      ...venue,
      top: 100 - normalize(venue.coordinates!.lat as number, minLat, maxLat),
      left: normalize(venue.coordinates!.lng as number, minLng, maxLng),
    }));
  }, [venues]);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Carte des lieux</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Explorez les lieux par position et ouvrez directement leur fiche.
            </p>
          </div>
          <div className="flex gap-2">
            {['', 'CAFE', 'CAFE_LOUNGE', 'RESTAURANT', 'HOTEL', 'COWORKING', 'CINEMA', 'EVENT_SPACE'].map((value) => (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => setType(value)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  type === value
                    ? 'border-amber-400 bg-amber-400 text-black'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {value || 'Tous'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
            {positioned.map((venue) => (
              <Link
                key={venue._id}
                href={getVenueHref(venue)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${venue.top}%`, left: `${venue.left}%` }}
              >
                <div className="rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200 shadow-[0_8px_30px_rgba(212,175,55,0.2)]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {venue.name}
                  </span>
                </div>
              </Link>
            ))}
          </section>

          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="mb-4 text-lg font-semibold">Liste rapide</h2>
            <div className="space-y-3">
              {venues.map((venue) => (
                <Link
                  key={venue._id}
                  href={getVenueHref(venue)}
                  className="block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition-colors hover:border-amber-400/30"
                >
                  <p className="font-medium text-zinc-100">{venue.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{venue.city}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
