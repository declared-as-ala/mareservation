'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { MapPin, Utensils, Coffee, Bed, Sparkles, Wine, Compass } from 'lucide-react';
import { Reveal } from './Reveal';

// High-quality premium fallback mock data matching the screenshot perfectly
const MOCK_REC_VENUES = [
  {
    _id: 'mock-1',
    name: 'Dar El Marsa',
    city: 'La Marsa, Tunis',
    type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
    slug: 'dar-el-marsa',
    isVedette: true,
    hasVirtualTour: true,
  },
  {
    _id: 'mock-2',
    name: 'Azure Palace Hotel',
    city: 'Hammamet',
    type: 'HOTEL',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop',
    slug: 'azure-palace-hotel',
    isVedette: true,
    hasVirtualTour: true,
  },
  {
    _id: 'mock-3',
    name: 'Sunset Beach Bar',
    city: 'Sousse',
    type: 'CAFE', // Shows as Beach Bar
    coverImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop',
    slug: 'sunset-beach-bar',
    isVedette: true,
    hasVirtualTour: true,
  }
];

function getCategoryInfo(type: string, name: string) {
  const t = String(type).toUpperCase();
  if (name.toLowerCase().includes('beach') || name.toLowerCase().includes('bar')) {
    return { label: 'Beach Bar', icon: Wine };
  }
  if (t === 'RESTAURANT') return { label: 'Restaurant', icon: Utensils };
  if (t === 'CAFE' || t === 'CAFE_LOUNGE') return { label: 'Café', icon: Coffee };
  if (t === 'HOTEL') return { label: 'Hôtel', icon: Bed };
  if (t === 'COWORKING') return { label: 'Coworking', icon: Compass };
  return { label: 'Lieu', icon: Sparkles };
}

export function RecommendedSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch real featured/vedette venues
  const { data: realVenues = [] } = useQuery({
    queryKey: ['public-recommended-venues'],
    queryFn: () => fetchVenues({ isFeatured: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Use real venues if available (up to 6), otherwise combine or use fallback
  const displayVenues = realVenues.length >= 2 
    ? realVenues.slice(0, 6) 
    : [...realVenues, ...MOCK_REC_VENUES.filter(m => !realVenues.some(r => r.name === m.name))].slice(0, 6);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.querySelector('[data-carousel-item]')?.clientWidth || container.clientWidth;
    const idx = Math.round(scrollLeft / (itemWidth + 16)); // 16px gap
    setActiveIdx(Math.max(0, Math.min(idx, displayVenues.length - 1)));
  };

  return (
    <section className="relative overflow-hidden bg-[#0B0B0C] pt-6 pb-2 md:pt-12 md:pb-6 text-white">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -z-10 h-[300px] w-[300px] rounded-full bg-amber-500/[0.03] blur-[80px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">
        
        {/* Header exact like the image */}
        <div className="mb-6 flex flex-col items-start md:mb-8">
          <Reveal>
            <h2 className="flex items-center gap-1.5 font-sans text-xl font-bold tracking-tight text-white md:text-2xl">
              Recommandé pour vous <span className="text-amber-400 font-serif">✨</span>
            </h2>
            <p className="mt-1 text-xs font-medium text-zinc-500 tracking-wide">
              Découvrez nos meilleures adresses
            </p>
          </Reveal>
        </div>

        {/* Carousel/Track */}
        <div className="relative">
          {/* Mobile view: horizontal touch track */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex w-full gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4 md:hidden"
          >
            {displayVenues.map((venue, idx) => {
              const { label: catLabel, icon: CatIcon } = getCategoryInfo(venue.type, venue.name);
              const href = `/lieu/${venue.slug || venue._id}`;
              return (
                <div 
                  key={venue._id}
                  data-carousel-item
                  className="w-[280px] shrink-0 snap-center first:pl-0"
                >
                  <Link href={href} className="group block relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-white/[0.06] bg-zinc-900/50 shadow-lg transition-all duration-300 active:scale-95">
                    {/* Image */}
                    {venue.coverImage ? (
                      <img 
                        src={venue.coverImage} 
                        alt={venue.name} 
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                        <Compass className="size-10 text-zinc-800" />
                      </div>
                    )}
                    {/* Shadow gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Category badge (top-left) */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 border border-white/10 backdrop-blur-md">
                      <CatIcon className="size-3 text-amber-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{catLabel}</span>
                    </div>

                    {/* 360° badge (top-right) */}
                    {venue.hasVirtualTour && (
                      <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 border border-white/10 backdrop-blur-md text-[10px] font-black text-amber-300 font-sans tracking-wide">
                        360°
                      </div>
                    )}

                    {/* Content overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors leading-tight">
                        {venue.name}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                        <MapPin className="size-3" />
                        <span>{venue.city}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Web view: gorgeous premium grid */}
          <div className="hidden md:grid grid-cols-3 gap-6 lg:gap-8">
            {displayVenues.slice(0, 3).map((venue, idx) => {
              const { label: catLabel, icon: CatIcon } = getCategoryInfo(venue.type, venue.name);
              const href = `/lieu/${venue.slug || venue._id}`;
              return (
                <Reveal key={venue._id} delay={idx * 0.08} y={20}>
                  <Link href={href} className="group block relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-amber-500/10 bg-zinc-950/40 shadow-2xl shadow-black/40 transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-400/40 hover:shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
                    {/* Inner glowing radial border */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    
                    {/* Image */}
                    {venue.coverImage ? (
                      <img 
                        src={venue.coverImage} 
                        alt={venue.name} 
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                        <Compass className="size-12 text-zinc-800" />
                      </div>
                    )}
                    
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-300" />

                    {/* Top action row */}
                    <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 rounded-full bg-black/75 px-3.5 py-1.5 border border-white/10 backdrop-blur-md">
                        <CatIcon className="size-3.5 text-amber-400" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">{catLabel}</span>
                      </div>
                      
                      {venue.hasVirtualTour && (
                        <div className="rounded-full bg-black/75 px-3 py-1.5 border border-white/10 backdrop-blur-md text-[10px] font-black text-amber-300 tracking-wider">
                          360°
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="text-lg font-bold text-white group-hover:text-amber-200 transition-colors duration-300">
                        {venue.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <MapPin className="size-3.5" />
                        <span>{venue.city}</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          {/* Dots Indicator below the carousel (mobile only) */}
          <div className="mt-3 flex items-center justify-center gap-1.5 md:hidden">
            {displayVenues.map((_, idx) => (
              <span 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIdx === idx ? 'w-4 bg-amber-400' : 'w-1.5 bg-zinc-700'
                }`}
              />
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
