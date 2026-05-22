'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { Star, ArrowRight, MapPin, Video } from 'lucide-react';
import { TypeBadge } from '@/components/shared/TypeBadge';
import { getVenueHref } from '@/lib/venueHref';

const CATEGORIES = [
  { type: 'CAFE', label: 'Cafés', href: '/explorer?type=CAFE' },
  { type: 'RESTAURANT', label: 'Restaurants', href: '/explorer?type=RESTAURANT' },
  { type: 'COWORKING', label: 'Coworking', href: '/explorer?type=COWORKING' },
  { type: 'HOTEL', label: 'Hôtels', href: '/explorer?type=HOTEL' },
  { type: 'CINEMA', label: 'Cinéma', href: '/explorer?type=CINEMA' },
  { type: 'EVENT_SPACE', label: 'Salles & Événementiel', href: '/explorer?type=EVENT_SPACE' },
];

function VenueSlide({ venue }: {
  venue: {
    _id: string;
    name: string;
    slug?: string;
    city?: string;
    type: string;
    coverImage?: string;
    startingPrice?: number;
    hasVirtualTour?: boolean;
    media?: { kind: string; url: string }[];
  }
}) {
  const href = getVenueHref(venue);
  const img = venue.coverImage ?? venue.media?.find((m) => m.kind === 'HERO_IMAGE')?.url ?? null;

  return (
    <Link
      href={href}
      className="group relative flex-shrink-0 w-[260px] sm:w-[300px] rounded-xl overflow-hidden border border-white/[0.05] bg-[#161618] hover:border-amber-400/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-[#111113]">
        {img ? (
          <Image src={img} alt={venue.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="300px" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <MapPin className="size-10 text-white/[0.06]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-transparent to-transparent" />

        <div className="absolute top-2.5 right-2.5">
          <TypeBadge type={venue.type as Parameters<typeof TypeBadge>[0]['type']} />
          {venue.hasVirtualTour && (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-[#0B0B0C]/70 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
              <Video className="size-2.5" /> 360°
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-semibold text-white/90 text-sm line-clamp-1 group-hover:text-amber-300 transition-colors">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin className="size-3 text-white/25 shrink-0" />
          <span className="text-xs text-white/35 truncate">{venue.city}</span>
        </div>
        <div className="mt-2.5">
          <span className="text-xs font-medium text-amber-400/80 flex items-center gap-1 group-hover:gap-1.5 group-hover:text-amber-400 transition-all">
            Réserver <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CategoryCarousel({ type, label, href }: { type: string; label: string; href: string }) {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['venues', 'vedette', type],
    queryFn: () => fetchVenues({ type, isVedette: true }),
    staleTime: 2 * 60 * 1000,
  });

  if (!isLoading && venues.length === 0) return null;

  return (
    <div className="mb-16 last:mb-0">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-5 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-500/15">
              <Star className="size-2.5 fill-black text-black" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
              {label} en vedette
            </span>
          </div>
        </div>
        <Link
          href={href}
          className="hidden sm:flex items-center gap-2 text-sm font-medium text-amber-400/70 hover:text-amber-400 transition-colors"
        >
          Voir tout <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Carousel */}
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[260px] sm:w-[300px] rounded-xl bg-[#161618]/50 border border-white/[0.04] animate-pulse"
            >
              <div className="h-40 bg-[#111113] rounded-t-xl" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                <div className="h-3 bg-white/[0.04] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
          {venues.map((venue) => (
            <VenueSlide key={venue._id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}

export function VedetteByCategorySection() {
  return (
    <section className="relative overflow-hidden bg-[#111113] py-16 text-white md:py-24">
      {/* Top border + subtle glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-amber-500/[0.015] blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-12 text-center md:mb-16">
          <div className="mx-auto mb-4 h-px w-12 bg-gradient-to-r from-amber-400/60 via-amber-400 to-amber-500/40" />
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-white/95 md:text-3xl">
            Nos coups de cœur
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Les lieux incontournables sélectionnés pour vous
          </p>
        </div>

        {/* Category carousels */}
        {CATEGORIES.map((cat) => (
          <CategoryCarousel key={cat.type} type={cat.type} label={cat.label} href={cat.href} />
        ))}
      </div>
    </section>
  );
}
