'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, MapPin, Sparkles, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Venue } from '@/lib/api/types';
import { TypeBadge } from '@/components/shared/TypeBadge';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { getVenueHref } from '@/lib/venueHref';

function getVenueImage(venue: Venue): string | null {
  if (venue.coverImage) return venue.coverImage;
  const hero = venue.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url ?? null;
}

interface VenueCardProps {
  venue: Venue;
  className?: string;
  /** Overrides the type badge (e.g. "Bar", "Rooftop") in collection views. */
  categoryLabel?: string;
}

export function VenueCard({ venue, className, categoryLabel }: VenueCardProps) {
  if (!venue?._id) return null;

  const href = getVenueHref(venue);
  const img = getVenueImage(venue);
  const venueName = venue.name || 'Lieu';
  const venueCity = venue.city || 'Tunisie';
  return (
    <Link href={href} className={cn('group block', className)}>
      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-xl hover:shadow-black/40">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.04]">
          {img ? (
            <Image
              src={img}
              alt={venueName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white/[0.04]">
              <MapPin className="size-10 text-neutral-600" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {venue.isVedette && (
              <span className="inline-flex items-center justify-center rounded-full border border-amber-300/45 bg-amber-400/20 p-1.5 text-amber-300 backdrop-blur-sm" title="Lieu d'exception">
                <Sparkles className="size-3.5" />
              </span>
            )}
            {venue.isFeatured && !venue.isVedette && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                Mis en avant
              </span>
            )}
            {venue.hasVirtualTour && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                <Video className="size-3" />
                360°
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-3">
            <FavoriteButton venueId={venue._id} size="sm" />
          </div>

          <div className="absolute bottom-3 right-3">
            {categoryLabel ? (
              <span className="inline-flex items-center rounded-full border-none bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                {categoryLabel}
              </span>
            ) : (
              <TypeBadge type={venue.type} />
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-neutral-100">{venueName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin className="size-3 shrink-0" />
            <span className="line-clamp-1">{venueCity}</span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 transition-all group-hover:border-amber-400/20 group-hover:bg-amber-400/10">
            <span className="text-xs font-semibold text-neutral-400 transition-colors group-hover:text-amber-300">
              Voir &amp; Réserver
            </span>
            <ArrowUpRight className="size-3.5 text-neutral-600 transition-colors group-hover:text-amber-300" />
          </div>
        </div>
      </div>
    </Link>
  );
}

