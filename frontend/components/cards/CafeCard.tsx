'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Coffee, Wifi, Plug, Trees, Video, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Venue } from '@/lib/api/types';
import { getVenueHref } from '@/lib/venueHref';

interface CafeCardProps {
  venue: Venue & { rating?: number };
  className?: string;
}

function getOpenStatus(): { open: boolean; label: string } {
  // Placeholder — until cafés expose opening hours.
  const h = new Date().getHours();
  if (h >= 7 && h < 23) return { open: true, label: `Ouvert · ferme à 23 h` };
  return { open: false, label: 'Fermé' };
}

function hasTag(venue: Venue, tag: string): boolean {
  return (venue.amenities ?? []).some((t) => t.toLowerCase() === tag);
}

export function CafeCard({ venue, className }: CafeCardProps) {
  const status = getOpenStatus();
  const hasWifi = hasTag(venue, 'wifi');
  const hasPlugs = hasTag(venue, 'prises');
  const hasTerrace = hasTag(venue, 'terrasse');

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
            <Coffee className="size-12 text-neutral-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

        {/* Café badge */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
          <Coffee className="size-3 text-amber-400" />
          Café
        </div>

        {/* 360° */}
        {venue.hasVirtualTour && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/70 px-2 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-md">
            <Video className="size-3" />
            360°
          </div>
        )}

        {/* Open status */}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          <span
            className={cn(
              'relative flex size-1.5',
              status.open ? '' : 'opacity-60'
            )}
          >
            {status.open && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            )}
            <span
              className={cn(
                'relative inline-flex size-1.5 rounded-full',
                status.open ? 'bg-emerald-400' : 'bg-neutral-500'
              )}
            />
          </span>
          <Clock className="size-3" />
          {status.label}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-serif text-base font-bold leading-tight text-white transition-colors group-hover:text-amber-100">
          {venue.name}
        </h3>

        {venue.city && (
          <div className="flex items-center gap-1 text-[11px] text-amber-400/80">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
        )}

        {/* Amenity row */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11px] text-neutral-500">
          {hasWifi && (
            <span className="inline-flex items-center gap-1 text-neutral-400">
              <Wifi className="size-3.5 text-amber-400/70" />
              Wi-Fi
            </span>
          )}
          {hasPlugs && (
            <span className="inline-flex items-center gap-1 text-neutral-400">
              <Plug className="size-3.5 text-amber-400/70" />
              Prises
            </span>
          )}
          {hasTerrace && (
            <span className="inline-flex items-center gap-1 text-neutral-400">
              <Trees className="size-3.5 text-amber-400/70" />
              Terrasse
            </span>
          )}
          <span className="ml-auto text-[12px] font-bold text-amber-400 transition-transform group-hover:translate-x-0.5">
            Voir →
          </span>
        </div>
      </div>
    </Link>
  );
}
