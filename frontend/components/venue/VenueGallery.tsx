'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface VenueGalleryProps {
  images: string[];
  venueName: string;
}

export function VenueGallery({ images, venueName }: VenueGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  const safeImages = images.filter((u) => Boolean(u) && !failedUrls.includes(u));
  if (safeImages.length === 0) return null;

  const prev = () =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + safeImages.length) % safeImages.length : 0));
  const next = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % safeImages.length : 0));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') setLightboxIndex(null);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Images className="size-4" />
          Galerie photos
          <span className="text-muted-foreground font-normal">({safeImages.length})</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {safeImages.slice(0, 6).map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="relative aspect-video overflow-hidden rounded-xl bg-muted group focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Image
                src={url}
                alt={`${venueName} — photo ${i + 1}`}
                fill
                onError={() => setFailedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]))}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {i === 5 && safeImages.length > 6 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                  +{safeImages.length - 6}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setLightboxIndex(null)}
            aria-label="Fermer"
          >
            <X className="size-6" />
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Précédent"
          >
            <ChevronLeft className="size-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeImages[lightboxIndex]}
            alt={`${venueName} — photo ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Suivant"
          >
            <ChevronRight className="size-8" />
          </button>
          <span className="absolute bottom-5 text-white/50 text-sm tabular-nums">
            {lightboxIndex + 1} / {safeImages.length}
          </span>
        </div>
      )}
    </>
  );
}
