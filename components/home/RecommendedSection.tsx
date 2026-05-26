'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import {
  MapPin, Utensils, Coffee, BedDouble, Sparkles,
  Wine, Clapperboard, Laptop, ChevronLeft, ChevronRight, Star,
} from 'lucide-react';
import { getVenueHref } from '@/lib/venueHref';

/* ─── Fallback data ─── */
const MOCK_VENUES = [
  {
    _id: 'mock-1', name: 'Dar El Marsa', city: 'La Marsa, Tunis', type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=900&auto=format&fit=crop',
    slug: 'dar-el-marsa', isVedette: true, hasVirtualTour: true, rating: 4.9, reviews: 284,
  },
  {
    _id: 'mock-2', name: 'Azure Palace Hotel', city: 'Hammamet', type: 'HOTEL',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=900&auto=format&fit=crop',
    slug: 'azure-palace-hotel', isVedette: true, hasVirtualTour: true, rating: 4.8, reviews: 192,
  },
  {
    _id: 'mock-3', name: 'Sunset Beach Bar', city: 'Sousse', type: 'CAFE',
    coverImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop',
    slug: 'sunset-beach-bar', isVedette: true, hasVirtualTour: true, rating: 4.7, reviews: 156,
  },
  {
    _id: 'mock-4', name: 'Le Chalet Carthage', city: 'Carthage, Tunis', type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop',
    slug: 'le-chalet-carthage', isVedette: true, hasVirtualTour: true, rating: 4.8, reviews: 218,
  },
  {
    _id: 'mock-5', name: 'Sidi Bou Rooftop', city: 'Sidi Bou Said', type: 'CAFE',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop',
    slug: 'sidi-bou-rooftop', isVedette: true, hasVirtualTour: false, rating: 4.6, reviews: 134,
  },
  {
    _id: 'mock-6', name: 'Le Zéphyr Tunis', city: 'Tunis Centre', type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=900&auto=format&fit=crop',
    slug: 'le-zephyr-tunis', isVedette: true, hasVirtualTour: true, rating: 4.9, reviews: 307,
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

const DESKTOP_PAGE_SIZE = 3;

export function RecommendedSection() {
  /* ─ Mobile state ─ */
  const [mobileIdx, setMobileIdx] = useState(0);
  const mobileRef = useRef<HTMLDivElement>(null);

  /* ─ Desktop carousel state ─ */
  const [page, setPage] = useState(0);

  const { data: realVenues = [] } = useQuery({
    queryKey: ['public-recommended-venues'],
    queryFn: () => fetchVenues({ isFeatured: true }),
    staleTime: 5 * 60 * 1000,
  });

  const displayVenues =
    realVenues.length >= 2
      ? realVenues.slice(0, 9)
      : [
          ...realVenues,
          ...MOCK_VENUES.filter((m) => !realVenues.some((r) => r.name === m.name)),
        ].slice(0, 6);

  const totalPages = Math.ceil(displayVenues.length / DESKTOP_PAGE_SIZE);
  const pageVenues = displayVenues.slice(
    page * DESKTOP_PAGE_SIZE,
    page * DESKTOP_PAGE_SIZE + DESKTOP_PAGE_SIZE,
  );

  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const next = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);

  const handleMobileScroll = () => {
    if (!mobileRef.current) return;
    const el = mobileRef.current;
    const w = (el.querySelector('[data-item]') as HTMLElement)?.offsetWidth ?? el.clientWidth;
    setMobileIdx(Math.round(el.scrollLeft / (w + 12)));
  };

  return (
    <section className="bg-[#0B0B0C] px-4 pb-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* ── Header row ── */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white md:text-2xl">
              Recommandé pour vous
              <span className="text-amber-400" aria-hidden="true">✦</span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">Découvrez nos meilleures adresses</p>
          </div>
        </div>

        {/* ── Mobile View Wrapper ── */}
        <div className="relative md:hidden group/mobile-carousel">
          {/* Mobile: horizontal scroll */}
          <div
            ref={mobileRef}
            onScroll={handleMobileScroll}
            className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-3 px-1"
          >
            {displayVenues.map((venue) => {
              const { label, Icon } = getCategoryInfo(venue.type, venue.name);
              return (
                <div key={venue._id} data-item className="w-[30.2vw] min-w-[104px] max-w-[120px] shrink-0 snap-center">
                  <VenueCard venue={venue as any} label={label} Icon={Icon} href={getVenueHref(venue as any)} />
                </div>
              );
            })}
          </div>

          {/* Dot indicators — mobile only */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {displayVenues.map((_, i) => (
              <button
                key={i}
                aria-label={`Aller au lieu ${i + 1}`}
                onClick={() => {
                  const el = mobileRef.current;
                  if (!el) return;
                  const w = (el.querySelector('[data-item]') as HTMLElement)?.offsetWidth ?? 110;
                  el.scrollTo({ left: i * (w + 8), behavior: 'smooth' });
                  setMobileIdx(i);
                }}
                className={`size-1.5 rounded-full transition-all duration-300 ${
                  mobileIdx === i ? 'bg-amber-400' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Desktop: 3-col carousel ── */}
        <div className="hidden md:block relative group/desktop-carousel">
          {/* Desktop Prev Arrow */}
          <button
            onClick={prev}
            disabled={page === 0}
            aria-label="Précédent"
            className="absolute -left-6 lg:-left-8 top-[40%] -translate-y-1/2 z-20 flex size-12 items-center justify-center rounded-full border border-white/10 bg-zinc-950/85 backdrop-blur-md text-white transition-all duration-300 hover:scale-110 active:scale-95 hover:border-amber-400/50 hover:bg-amber-400 hover:text-black disabled:opacity-0 disabled:pointer-events-none shadow-[0_8px_32px_rgba(0,0,0,0.6)] opacity-0 group-hover/desktop-carousel:opacity-100"
          >
            <ChevronLeft className="size-6" />
          </button>

          {/* Desktop Next Arrow */}
          <button
            onClick={next}
            disabled={page >= totalPages - 1}
            aria-label="Suivant"
            className="absolute -right-6 lg:-right-8 top-[40%] -translate-y-1/2 z-20 flex size-12 items-center justify-center rounded-full border border-white/10 bg-zinc-950/85 backdrop-blur-md text-white transition-all duration-300 hover:scale-110 active:scale-95 hover:border-amber-400/50 hover:bg-amber-400 hover:text-black disabled:opacity-0 disabled:pointer-events-none shadow-[0_8px_32px_rgba(0,0,0,0.6)] opacity-0 group-hover/desktop-carousel:opacity-100"
          >
            <ChevronRight className="size-6" />
          </button>

          <div className="grid grid-cols-3 gap-5 lg:gap-6">
            {pageVenues.map((venue) => {
              const { label, Icon } = getCategoryInfo(venue.type, venue.name);
              return (
                <DesktopVenueCard
                  key={venue._id}
                  venue={venue as any}
                  label={label}
                  Icon={Icon}
                  href={getVenueHref(venue as any)}
                />
              );
            })}
          </div>

          {/* Page dots */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  aria-label={`Page ${i + 1}`}
                  onClick={() => setPage(i)}
                  className={`rounded-full transition-all duration-300 ${
                    page === i ? 'h-1.5 w-6 bg-amber-400' : 'size-1.5 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Mobile card (compact, same as before) ─── */
interface CardProps {
  venue: { name: string; city?: string; coverImage?: string; hasVirtualTour?: boolean; rating?: number };
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
}

function VenueCard({ venue, label, Icon, href }: CardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl bg-[#0f0f10] border border-amber-400/[0.08] transition-all duration-300 hover:border-amber-400/30 active:scale-95"
    >
      <div className="relative aspect-[1.1] w-full overflow-hidden bg-zinc-950">
        {venue.coverImage ? (
          <Image
            src={venue.coverImage}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 31vw, 120px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="size-6 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category badge */}
        <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 border border-white/10 backdrop-blur-sm">
          <Icon className="size-2.5 text-amber-400" />
          <span className="text-[7px] font-bold uppercase tracking-wider text-white">{label}</span>
        </div>

        {/* 360° Tour Badge */}
        {venue.hasVirtualTour && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 border border-white/10 backdrop-blur-sm text-[7px] font-black text-amber-300 tracking-wider">
            360°
          </div>
        )}
      </div>
      
      <div className="px-2 py-1.5">
        <p className="text-[10px] sm:text-[11px] font-bold text-white group-hover:text-amber-200 transition-colors leading-tight truncate">
          {venue.name}
        </p>
        {venue.city && (
          <div className="mt-0.5 flex items-center gap-0.5 text-[8.5px] text-amber-400/90 truncate">
            <MapPin className="size-2 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Desktop card (richer design) ─── */
function DesktopVenueCard({ venue, label, Icon, href }: CardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950 transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-400/35 hover:shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(245,158,11,0.12)]"
    >
      {/* Image */}
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {venue.coverImage ? (
          <Image
            src={venue.coverImage}
            alt={venue.name}
            fill
            sizes="(max-width: 1024px) 33vw, 380px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.08]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900">
            <Icon className="size-12 text-zinc-700" />
          </div>
        )}

        {/* Strong bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

        {/* Hover overlay CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-black shadow-lg shadow-amber-400/30">
            Voir le lieu →
          </span>
        </div>

        {/* Category badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 border border-white/10 backdrop-blur-md">
          <Icon className="size-3 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">{label}</span>
        </div>

        {/* 360° badge */}
        {venue.hasVirtualTour && (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1.5 border border-amber-400/30 backdrop-blur-md text-xs font-black text-amber-300 tracking-wider">
            360°
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-amber-200">
              {venue.name}
            </h3>
            {venue.city && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-400/80">
                <MapPin className="size-2.5 shrink-0" />
                <span className="truncate">{venue.city}</span>
              </div>
            )}
          </div>
          {/* Rating */}
          {(venue as any).rating && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-2 py-1 border border-amber-400/20">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{(venue as any).rating}</span>
            </div>
          )}
        </div>

        {/* Separator + reviews */}
        {(venue as any).reviews && (
          <p className="mt-2.5 border-t border-white/[0.05] pt-2.5 text-xs text-zinc-500">
            {(venue as any).reviews} avis vérifiés
          </p>
        )}
      </div>
    </Link>
  );
}
