'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  MapPin,
  Star,
  Wifi,
  Car,
  Waves,
  Sparkles,
  UtensilsCrossed,
  Video,
  ArrowUpRight,
  BedDouble,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Venue } from '@/lib/api/types';
import { FavoriteButton } from '@/components/shared/FavoriteButton';

// ── Amenity mini icons ──────────────────────────────────────────────────────

const AMENITY_ICON_MAP: Record<string, React.ReactNode> = {
  wifi: <Wifi className="size-3.5" />,
  parking: <Car className="size-3.5" />,
  pool: <Waves className="size-3.5" />,
  spa: <Sparkles className="size-3.5" />,
  restaurant: <UtensilsCrossed className="size-3.5" />,
};

const COMMON_AMENITIES = ['wifi', 'pool', 'parking', 'spa', 'restaurant'];

function guessAmenities(venue: Venue): string[] {
  const desc = ((venue.description || '') + (venue.shortDescription || '')).toLowerCase();
  return COMMON_AMENITIES.filter(
    (a) =>
      desc.includes(a) ||
      desc.includes(a === 'pool' ? 'piscine' : a) ||
      desc.includes(a === 'parking' ? 'parking' : a) ||
      desc.includes(a === 'spa' ? 'spa' : a) ||
      desc.includes(a === 'restaurant' ? 'restaurant' : a) ||
      desc.includes(a === 'wifi' ? 'wifi' : a)
  );
}

function getVenueImage(venue: Venue): string | null {
  if (venue.coverImage) return venue.coverImage;
  const hero = venue.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url ?? venue.gallery?.[0] ?? null;
}

// ── Star rating display ─────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3',
            i < full ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/20'
          )}
        />
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface HotelCardProps {
  venue: Venue;
  className?: string;
  /** Detected star rating from venue data (1-5) */
  starRating?: number;
}

export function HotelCard({ venue, className, starRating = 4 }: HotelCardProps) {
  if (!venue?._id) return null;

  const href = `/hotel/${venue.slug || venue._id}`;
  const img = getVenueImage(venue);
  const price = venue.minRoomPrice ?? venue.startingPrice ?? venue.priceRangeMin;
  const amenities = guessAmenities(venue);
  const isLuxury = starRating >= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('group', className)}
    >
      <Link href={href} className="block">
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0C0C0C] shadow-lg transition-all duration-300 hover:border-amber-400/25 hover:shadow-2xl hover:shadow-amber-400/10 hover:-translate-y-1">

          {/* ── Image wrapper ── */}
          <div className="relative aspect-[3/2] w-full overflow-hidden bg-black/40">
            {img ? (
              <Image
                src={img}
                alt={venue.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BedDouble className="size-14 text-neutral-700" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Top-left: Premium or Luxe badge */}
            {(venue.isVedette || isLuxury) && (
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 backdrop-blur-md">
                  <Crown className="size-2.5" />
                  {venue.isVedette ? 'Premium' : 'Luxe'}
                </span>
              </div>
            )}

            {/* Top-right: 360° badge */}
            {venue.hasVirtualTour && (
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                  <Video className="size-3" />
                  360°
                </span>
              </div>
            )}

            {/* Bottom-left: favorite */}
            <div className="absolute bottom-3 left-3 z-10" onClick={(e) => e.preventDefault()}>
              <FavoriteButton venueId={venue._id} size="sm" />
            </div>

          </div>

          {/* ── Body ── */}
          <div className="flex flex-col gap-3 p-4">

            {/* Name + location */}
            <div>
              <h3 className="line-clamp-1 text-[15px] font-semibold text-neutral-100 leading-tight group-hover:text-amber-100 transition-colors">
                {venue.name}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                <MapPin className="size-3 shrink-0" />
                <span className="line-clamp-1">
                  {[venue.city, venue.governorate].filter(Boolean).join(', ') || 'Tunisie'}
                </span>
              </div>
            </div>

            {/* Amenity icons */}
            {amenities.length > 0 && (
              <div className="flex items-center gap-2">
                {amenities.slice(0, 4).map((a) => (
                  <div
                    key={a}
                    title={a}
                    className="flex items-center justify-center size-6 rounded-md bg-white/[0.05] text-neutral-400"
                  >
                    {AMENITY_ICON_MAP[a]}
                  </div>
                ))}
                {amenities.length > 4 && (
                  <span className="text-[10px] text-neutral-600">+{amenities.length - 4}</span>
                )}
              </div>
            )}

            {/* Availability / Popular indicator */}
            {(venue.isFeatured || venue.isVedette) && (
              <div className="flex items-center gap-1.5">
                {venue.isVedette ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Disponible
                  </span>
                ) : venue.isFeatured ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    Populaire
                  </span>
                ) : null}
              </div>
            )}

            {/* Price + CTA */}
            <div className="flex items-end justify-between pt-1 mt-auto">
              <div>
                {price ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-amber-400">
                        {price.toLocaleString('fr-TN')} DT
                      </span>
                      <span className="text-xs text-neutral-600">/ nuit</span>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-neutral-600 italic">Prix sur demande</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-all group-hover:bg-amber-400/15 group-hover:border-amber-400/40">
                Voir
                <ArrowUpRight className="size-3.5" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
