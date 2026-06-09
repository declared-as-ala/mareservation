'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Images, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VenueGalleryProps {
  images: string[];
  venueName: string;
  /** Optional section title override. */
  title?: string;
  className?: string;
}

export function VenueGallery({ images, venueName, title = 'Galerie photos', className }: VenueGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  const safeImages = images.filter((u) => Boolean(u) && !failedUrls.includes(u));
  const open = lightboxIndex !== null;

  // Lock body scroll while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard navigation (global while open).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? (i - 1 + safeImages.length) % safeImages.length : 0));
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null ? (i + 1) % safeImages.length : 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, safeImages.length]);

  if (safeImages.length === 0) return null;

  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + safeImages.length) % safeImages.length : 0));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % safeImages.length : 0));
  const markFailed = (url: string) => setFailedUrls((p) => (p.includes(url) ? p : [...p, url]));

  // Mosaic: first image is the hero (spans 2 rows on sm+), next up to 4 fill the grid.
  const tiles = safeImages.slice(0, 5);
  const extra = safeImages.length - tiles.length;

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-200">
          <Images className="size-4 text-amber-400" />
          {title}
          <span className="text-sm font-normal text-neutral-500">({safeImages.length})</span>
        </h2>
        {safeImages.length > 1 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-amber-400/40 hover:text-amber-300"
          >
            <Expand className="size-3.5" />
            Voir les {safeImages.length} photos
          </button>
        )}
      </div>

      {/* Mosaic */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2">
        {tiles.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => setLightboxIndex(i)}
            aria-label={`Agrandir la photo ${i + 1}`}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] transition-all hover:ring-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/60',
              // Hero tile spans 2x2 on sm+; on mobile it spans full width.
              i === 0 ? 'col-span-2 aspect-[16/10] sm:row-span-2 sm:aspect-auto' : 'aspect-[4/3] sm:aspect-auto'
            )}
          >
            <Image
              src={url}
              alt={`${venueName} — photo ${i + 1}`}
              fill
              onError={() => markFailed(url)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={i === 0 ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, 25vw'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            {/* "+N" overlay on the last visible tile */}
            {i === tiles.length - 1 && extra > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-[1px] transition-colors group-hover:bg-black/70">
                <Images className="mb-1 size-5 text-amber-300" />
                <span className="text-lg font-black">+{extra}</span>
                <span className="text-[11px] text-white/70">photos</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galerie — ${venueName}`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-sm font-medium text-white/70 tabular-nums">
              {(lightboxIndex ?? 0) + 1} / {safeImages.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Fermer"
              className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/85 transition-colors hover:bg-white/[0.12]"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Stage */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-16">
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Précédent"
                className="absolute left-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/15 sm:left-4 sm:size-12"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImages[lightboxIndex ?? 0]}
              alt={`${venueName} — photo ${(lightboxIndex ?? 0) + 1}`}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Suivant"
                className="absolute right-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/15 sm:right-4 sm:size-12"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {safeImages.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
              {safeImages.map((url, i) => (
                <button
                  key={`thumb-${url}-${i}`}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={cn(
                    'relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-lg border transition-all sm:w-20',
                    i === lightboxIndex ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-white/10 opacity-60 hover:opacity-100'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
