'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  Crown,
  Video,
  Images,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { ShareButton } from '@/components/venue/ShareButton';

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < count ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/20'
          )}
        />
      ))}
    </div>
  );
}

interface CinematicVenueHeroProps {
  name: string;
  images: string[];
  venueId: string;
  city?: string | null;
  address?: string | null;
  /** Category chip shown above the title, e.g. coworking / cinema badge. */
  categoryBadge?: { icon: LucideIcon; label: string };
  isVedette?: boolean;
  hasVirtualTour?: boolean;
  stars?: number;
  onBack: () => void;
}

/**
 * Cinematic, full-bleed venue hero shared by category detail pages
 * (coworking, cinema, …). Mirrors the hotel detail page hero so every
 * category gets the same premium structure. Owns its own lightbox.
 */
export function CinematicVenueHero({
  name,
  images,
  venueId,
  city,
  address,
  categoryBadge,
  isVedette,
  hasVirtualTour,
  stars,
  onBack,
}: CinematicVenueHeroProps) {
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
  const cover = images[0];
  const thumbs = images.slice(1, 5);
  const Badge = categoryBadge?.icon;

  return (
    <section className="relative h-[68vh] min-h-[460px] max-h-[760px] w-full overflow-hidden">
      {/* Cover */}
      {cover ? (
        <Image src={cover} alt={name} fill priority className="object-cover" sizes="100vw" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black" />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/35 to-[#080808]/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />
      <div aria-hidden className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-amber-500/[0.07] blur-[120px]" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-5">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/15 bg-black/40 backdrop-blur-md">
              <FavoriteButton venueId={venueId} />
            </div>
            <div className="rounded-full border border-white/15 bg-black/40 backdrop-blur-md">
              <ShareButton title={name} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-8 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {categoryBadge && Badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
                  <Badge className="size-3" />
                  {categoryBadge.label}
                </span>
              )}
              {isVedette && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
                  <Crown className="size-3" />
                  Prestige
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
              {name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/75">
              {(address || city) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-amber-400" />
                  <span>{[address, city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {typeof stars === 'number' && stars > 0 && (
                <>
                  <span className="hidden h-3.5 w-px bg-white/20 sm:block" />
                  <StarRow count={stars} />
                </>
              )}
              {hasVirtualTour && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  <Video className="size-3" /> Visite 360°
                </span>
              )}
            </div>
          </motion.div>

          {/* Thumbnail rail */}
          {thumbs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              {thumbs.map((src, i) => {
                const isLast = i === thumbs.length - 1;
                const remaining = images.length - 5;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setLightboxIdx(i + 1)}
                    className="group relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/15 sm:size-20"
                    aria-label={`Voir la photo ${i + 2}`}
                  >
                    <Image
                      src={src}
                      alt={`${name} — photo ${i + 2}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="80px"
                    />
                    {isLast && remaining > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-sm font-bold text-white">
                        +{remaining}
                      </div>
                    )}
                    <div className="absolute inset-0 ring-0 ring-amber-400/0 transition-all group-hover:ring-2 group-hover:ring-amber-400/60" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setLightboxIdx(0)}
                className="inline-flex h-16 items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-4 text-xs font-semibold text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:text-amber-400 sm:h-20"
              >
                <Images className="size-4" />
                <span className="hidden sm:inline">Toutes<br />les photos</span>
                <span className="sm:hidden">Photos</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && images[lightboxIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setLightboxIdx(null)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.max(0, (i ?? 0) - 1)); }}
              className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
              aria-label="Précédent"
            >
              <ChevronLeft className="size-6" />
            </button>

            <div
              className="relative mx-auto aspect-video w-full max-w-5xl px-20"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[lightboxIdx]}
                alt={`${name} — photo ${lightboxIdx + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.min(images.length - 1, (i ?? 0) + 1)); }}
              className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
              aria-label="Suivant"
            >
              <ChevronRight className="size-6" />
            </button>

            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/60">
              {lightboxIdx + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
