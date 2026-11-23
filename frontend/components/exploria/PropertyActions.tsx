'use client';

import { useEffect, useState } from 'react';
import { Check, Rotate3d, Share2, X } from 'lucide-react';
import { TourViewer } from './TourViewer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { formatMoney } from '@/lib/booking/dates';

function useLockScroll(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', k); };
  }, [open, onClose]);
}

/** "Explorer cette maison en 360°" — opens the existing Spinview360 viewer in a fullscreen-capable modal. */
export function Tour360Button({ url, name, poster }: { url: string; name: string; poster?: string | null }) {
  const [open, setOpen] = useState(false);
  useLockScroll(open, () => setOpen(false));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-amber-500 bg-transparent px-6 text-sm font-bold text-amber-200 backdrop-blur transition hover:bg-amber-400 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
        <Rotate3d className="size-5" aria-hidden="true" /> Explorer cette maison en 360°
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Visite 360° — ${name}`} className="on-dark fixed inset-0 z-[90] flex flex-col bg-black/95 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3 text-white">
            <p className="truncate font-serif text-xl">{name} — visite 360°</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer la visite" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
          </div>
          <div className="mx-auto w-full max-w-6xl flex-1">
            <TourViewer url={url} title={`Visite virtuelle 360° — ${name}`} posterLabel={name} posterImage={poster ?? null} />
          </div>
        </div>
      )}
    </>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }
        } catch {
          /* user cancelled */
        }
      }}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white hover:border-amber-400"
    >
      {copied ? <Check className="size-4 text-emerald-300" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
      {copied ? 'Lien copié' : 'Partager'}
    </button>
  );
}

/** Mobile: sticky booking bar + accessible bottom sheet with the real booking widget. */
export function MobileBookingBar({ venueKey, venueName, fromPrice, demo }: { venueKey: string; venueName: string; fromPrice: number | null; demo: boolean }) {
  const [open, setOpen] = useState(false);
  useLockScroll(open, () => setOpen(false));
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-white/10 bg-[#0B0B0C]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {fromPrice != null ? <p className="text-white"><span className="text-lg font-bold">{formatMoney(fromPrice)}</span> <span className="text-sm text-neutral-400">/ nuit</span></p> : <p className="text-sm text-neutral-300">Voir les disponibilités</p>}
            {demo && <p className="text-xs text-amber-300">Démonstration</p>}
          </div>
          <button type="button" onClick={() => setOpen(true)} className="h-12 shrink-0 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 font-bold text-black">Réserver</button>
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      {open && (
        <div className="fixed inset-0 z-[65] lg:hidden" role="dialog" aria-modal="true" aria-label="Réservation">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/75" onClick={() => setOpen(false)} />
          <div id="reserver" className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[#0B0B0C] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0B0B0C] px-4 py-3">
              <span className="mx-auto h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute end-3 top-2 grid size-10 place-items-center rounded-full border border-white/15 text-white"><X className="size-4" /></button>
            </div>
            <div className="px-3">
              <BookingWidget venueKey={venueKey} venueName={venueName} tourAnchor="#visite" compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
