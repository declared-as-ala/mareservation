'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { MapPin, Utensils, Coffee, BedDouble, Sparkles, Wine, Clapperboard, Laptop } from 'lucide-react';
import { getVenueHref } from '@/lib/venueHref';

/* ─── Static fallback matching the screenshot exactly ─── */
const MOCK_VENUES = [
  {
    _id: 'mock-1',
    name: 'Dar El Marsa',
    city: 'La Marsa, Tunis',
    type: 'RESTAURANT',
    coverImage:
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
    slug: 'dar-el-marsa',
    isVedette: true,
    hasVirtualTour: true,
  },
  {
    _id: 'mock-2',
    name: 'Azure Palace Hotel',
    city: 'Hammamet',
    type: 'HOTEL',
    coverImage:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop',
    slug: 'azure-palace-hotel',
    isVedette: true,
    hasVirtualTour: true,
  },
  {
    _id: 'mock-3',
    name: 'Sunset Beach Bar',
    city: 'Sousse',
    type: 'CAFE',
    coverImage:
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop',
    slug: 'sunset-beach-bar',
    isVedette: true,
    hasVirtualTour: true,
  },
  {
    _id: 'mock-4',
    name: 'Le Chalet Carthage',
    city: 'Carthage, Tunis',
    type: 'RESTAURANT',
    coverImage:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop',
    slug: 'le-chalet-carthage',
    isVedette: true,
    hasVirtualTour: true,
  },
  {
    _id: 'mock-5',
    name: 'Sidi Bou Rooftop',
    city: 'Sidi Bou Said',
    type: 'CAFE',
    coverImage:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop',
    slug: 'sidi-bou-rooftop',
    isVedette: true,
    hasVirtualTour: false,
  },
];

function getCategoryInfo(type: string, name: string) {
  const t = String(type).toUpperCase();
  const n = name.toLowerCase();
  if (n.includes('beach') || n.includes('bar')) return { label: 'Beach Bar', Icon: Wine };
  if (t === 'RESTAURANT') return { label: 'Restaurant', Icon: Utensils };
  if (t === 'CAFE' || t === 'CAFE_LOUNGE') return { label: 'Café', Icon: Coffee };
  if (t === 'HOTEL') return { label: 'Hôtel', Icon: BedDouble };
  if (t === 'COWORKING') return { label: 'Coworking', Icon: Laptop };
  if (t === 'CINEMA') return { label: 'Cinéma', Icon: Clapperboard };
  return { label: 'Lieu', Icon: Sparkles };
}

export function RecommendedSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: realVenues = [] } = useQuery({
    queryKey: ['public-recommended-venues'],
    queryFn: () => fetchVenues({ isFeatured: true }),
    staleTime: 5 * 60 * 1000,
  });

  const displayVenues =
    realVenues.length >= 2
      ? realVenues.slice(0, 6)
      : [
          ...realVenues,
          ...MOCK_VENUES.filter((m) => !realVenues.some((r) => r.name === m.name)),
        ].slice(0, 6);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const itemW = (el.querySelector('[data-item]') as HTMLElement)?.offsetWidth ?? el.clientWidth;
    setActiveIdx(Math.round(el.scrollLeft / (itemW + 12)));
  };

  return (
    <section className="bg-[#0B0B0C] px-4 pb-2 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-5">
          <h2 className="flex items-center gap-1.5 text-xl font-bold text-white">
            Recommandé pour vous{' '}
            <span className="text-amber-400">✦</span>
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">Découvrez nos meilleures adresses</p>
        </div>

        {/* ── Mobile: horizontal scroll ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-3 md:hidden"
        >
          {displayVenues.map((venue) => {
            const { label, Icon } = getCategoryInfo(venue.type, venue.name);
            const href = getVenueHref(venue as any);
            return (
              <div
                key={venue._id}
                data-item
                className="w-[58vw] max-w-[220px] shrink-0 snap-center"
              >
                <VenueCard venue={venue as any} label={label} Icon={Icon} href={href} />
              </div>
            );
          })}
        </div>

        {/* Dot indicators — mobile only */}
        <div className="mt-3 flex items-center justify-center gap-1.5 md:hidden">
          {displayVenues.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const itemW = (el.querySelector('[data-item]') as HTMLElement)?.offsetWidth ?? 220;
                el.scrollTo({ left: i * (itemW + 12), behavior: 'smooth' });
                setActiveIdx(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIdx === i ? 'w-4 bg-amber-400' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* ── Desktop: grid ── */}
        <div className="hidden md:grid grid-cols-3 gap-5 lg:gap-6">
          {displayVenues.slice(0, 3).map((venue) => {
            const { label, Icon } = getCategoryInfo(venue.type, venue.name);
            const href = getVenueHref(venue as any);
            return (
              <VenueCard key={venue._id} venue={venue as any} label={label} Icon={Icon} href={href} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Shared card component ─── */
interface VenueCardProps {
  venue: {
    name: string;
    city?: string;
    coverImage?: string;
    hasVirtualTour?: boolean;
  };
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
}

function VenueCard({ venue, label, Icon, href }: VenueCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl bg-zinc-900 border border-white/[0.06] transition-all duration-300 hover:border-amber-400/30 active:scale-95"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
        {venue.coverImage ? (
          <img
            src={venue.coverImage}
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-700">
            <Icon className="size-8" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Category badge — top left */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 border border-white/10 backdrop-blur-sm">
          <Icon className="size-3 text-amber-400" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-white">{label}</span>
        </div>

        {/* 360° badge — top right */}
        {venue.hasVirtualTour && (
          <div className="absolute right-2.5 top-2.5 rounded-full bg-black/65 px-2.5 py-1 border border-white/10 backdrop-blur-sm text-[9px] font-black text-amber-300 tracking-wider">
            360°
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        <p className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors leading-snug">
          {venue.name}
        </p>
        {venue.city && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
            <MapPin className="size-2.5 shrink-0" />
            <span>{venue.city}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
