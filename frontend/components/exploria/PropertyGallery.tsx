'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';

/** Photo mosaic + fullscreen, keyboard/touch friendly lightbox. Only real photos are passed in. */
export function PropertyGallery({ images, name }: { images: string[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;
  const go = useCallback((d: number) => setOpen((i) => (i == null ? i : (i + d + count) % count)), [count]);

  useEffect(() => {
    if (open == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, go]);

  const [touchX, setTouchX] = useState<number | null>(null);
  if (!count) return null;
  const shown = images.slice(0, 5);

  return (
    <>
      <div className={`grid gap-2 overflow-hidden rounded-[1.5rem] ${shown.length >= 3 ? 'sm:grid-cols-4 sm:grid-rows-2' : shown.length === 2 ? 'sm:grid-cols-2' : ''} aspect-[4/3] sm:aspect-[21/9]`}>
        {shown.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Agrandir la photo ${i + 1} sur ${count}`}
            className={`relative overflow-hidden bg-[#161617] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-400 ${i === 0 && shown.length >= 3 ? 'sm:col-span-2 sm:row-span-2' : ''} ${i > 0 ? 'hidden sm:block' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${name} — photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-[1.04] motion-reduce:transition-none" />
          </button>
        ))}
      </div>
      {count > 1 && (
        <button type="button" onClick={() => setOpen(0)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white hover:border-amber-400">
          <Images className="size-4" aria-hidden="true" /> Voir les {count} photos
        </button>
      )}

      {open != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photos de ${name}`}
          className="on-dark ex-sheet-in fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX == null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            setTouchX(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={open} src={images[open]} alt={`${name} — photo ${open + 1}`} className="ex-pop max-h-[86dvh] max-w-[94vw] rounded-lg object-contain" />
          <p className="absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] -translate-x-1/2 text-sm text-white/70">{open + 1} / {count}</p>
          <button type="button" onClick={() => setOpen(null)} aria-label="Fermer" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="size-6" /></button>
              <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="size-6" /></button>
            </>
          )}
        </div>
      )}
    </>
  );
}
