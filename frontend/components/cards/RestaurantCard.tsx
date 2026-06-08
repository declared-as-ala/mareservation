'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Video, Clock, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Venue } from '@/lib/api/types';
import { getVenueHref } from '@/lib/venueHref';

interface RestaurantCardProps {
  venue: Venue & { rating?: number; cuisineType?: string };
  /** Suggested reservation slot to display on the card */
  slot?: string; // e.g. "19:00"
  className?: string;
}

function PriceTier({ tier }: { tier: number }) {
  return (
    <span className="inline-flex items-center font-bold tracking-tight">
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={i < tier ? 'text-amber-400' : 'text-white/15'}>
          €
        </span>
      ))}
    </span>
  );
}

function getPriceTier(venue: Venue): number {
  const p = venue.startingPrice ?? venue.priceRangeMin ?? 0;
  if (p === 0) return 1;
  if (p < 40) return 1;
  if (p < 100) return 2;
  return 3;
}

function getCuisineFromTags(venue: Venue): string | null {
  const map: Record<string, string> = {
    tunisien: 'Tunisien',
    italien: 'Italien',
    japonais: 'Japonais',
    libanais: 'Libanais',
    français: 'Français',
    'fruits-de-mer': 'Fruits de mer',
    végé: 'Végé',
    steakhouse: 'Steakhouse',
    brunch: 'Brunch',
  };
  for (const tag of venue.amenities ?? []) {
    const key = tag.toLowerCase();
    if (map[key]) return map[key];
  }
  return null;
}

export function RestaurantCard({ venue, slot, className }: RestaurantCardProps) {
  const cuisine = (venue as any).cuisineType ?? getCuisineFromTags(venue);
  const tier = getPriceTier(venue);

  return (
    <Link
      href={getVenueHref(venue)}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-400/10',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30">
        {venue.coverImage ? (
          <Image
            src={venue.coverImage}
            alt={venue.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UtensilsCrossed className="size-12 text-neutral-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Cuisine badge */}
        {cuisine && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
            <UtensilsCrossed className="size-3 text-amber-400" />
            {cuisine}
          </div>
        )}

        {/* 360° */}
        {venue.hasVirtualTour && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/70 px-2 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-md">
            <Video className="size-3" />
            360°
          </div>
        )}

        {/* Reservation slot chip */}
        {slot && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
            <Clock className="size-3" />
            Réserver {slot}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <h3 className="line-clamp-1 font-serif text-sm font-bold leading-tight text-white transition-colors group-hover:text-amber-100 sm:text-base">
          {venue.name}
        </h3>

        {venue.city && (
          <div className="flex items-center gap-1 text-[11px] text-amber-400/80">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-neutral-500">
            <PriceTier tier={tier} />
            <span className="hidden text-neutral-600 sm:inline">·</span>
            <span className="hidden truncate sm:inline">Réservation rapide</span>
          </div>
          <span className="shrink-0 text-[12px] font-bold text-amber-400 transition-transform group-hover:translate-x-0.5">
            Voir →
          </span>
        </div>
      </div>
    </Link>
  );
}
