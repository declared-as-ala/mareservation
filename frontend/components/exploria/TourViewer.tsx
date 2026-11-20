'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, Orbit, Play, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Only the hostname is shown as the credit; the tour's own watermark is never covered. */
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

type Phase = 'idle' | 'loading' | 'ready' | 'error';
const LOAD_TIMEOUT_MS = 20000;

interface TourViewerProps {
  url: string;
  /** Accessible title of the embedded player. */
  title: string;
  /** Small label on the poster, e.g. "Maison d'hôtes de démonstration". */
  posterLabel?: string;
  className?: string;
  /** Larger poster headline text. */
  posterTitle?: string;
  /** Real photo of the place, shown behind the call to action. */
  posterImage?: string | null;
}

/**
 * Embeds a third-party (3DVista) tour ONLY after an explicit click ("facade"), so the
 * heavy player never counts against first load. Controls live below the frame so they
 * never hide the tour's controls or its watermark/attribution.
 */
export function TourViewer({ url, title, posterLabel, posterTitle = 'Visiter en 360°', posterImage, className }: TourViewerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const start = useCallback(() => {
    clearTimer();
    setPhase('loading');
    timer.current = setTimeout(() => setPhase((p) => (p === 'loading' ? 'error' : p)), LOAD_TIMEOUT_MS);
  }, []);

  useEffect(() => clearTimer, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = frameRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }) | null;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (request) {
      void Promise.resolve(request()).catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
    } else {
      // e.g. iPhone Safari: no Fullscreen API for non-video elements → open the tour itself.
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const retry = () => {
    setAttempt((n) => n + 1);
    start();
  };

  return (
    <div className={className}>
      <div
        ref={frameRef}
        className={cn(
          'relative overflow-hidden bg-[#0B0B0C] ring-1 ring-amber-400/25',
          'aspect-[4/5] sm:aspect-[16/10] lg:aspect-video',
          isFullscreen ? 'rounded-none' : 'rounded-[1.5rem] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]'
        )}
      >
        {phase === 'idle' ? (
          <button
            type="button"
            onClick={start}
            aria-label={`${posterTitle}${posterLabel ? ` ${posterLabel}` : ''} — ${title}`}
            className="group absolute inset-0 flex flex-col items-center justify-end gap-4 px-6 pb-8 text-center focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-amber-400 sm:justify-center sm:pb-0"
          >
            {posterImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterImage}
                alt=""
                decoding="async"
                className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.16),transparent_62%)]" aria-hidden="true" />
            )}
            {/* legibility: darken the photo toward the call to action */}
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" aria-hidden="true" />

            {posterLabel && (
              <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-300 backdrop-blur">
                {posterLabel}
              </span>
            )}

            <span className="relative flex size-20 items-center justify-center rounded-full bg-amber-400 text-black shadow-[0_0_0_10px_rgba(251,191,36,0.25),0_18px_50px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-110 sm:size-24">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40 [animation-duration:2.2s]" aria-hidden="true" />
              <Play className="relative ml-1 size-9 fill-current" aria-hidden="true" />
            </span>

            <span className="relative inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-black shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-all group-hover:bg-amber-300 sm:text-base">
              <Orbit className="size-4" aria-hidden="true" />
              Cliquez pour visiter en 360°
            </span>
            <span className="relative text-xs text-white/80 sm:text-sm">Faites glisser pour regarder autour de vous</span>
          </button>
        ) : (
          <>
            {phase === 'loading' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0B0B0C]" role="status" aria-live="polite">
                <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_40%,rgba(205,178,122,0.12),transparent_60%)]" aria-hidden="true" />
                <Orbit className="relative size-10 animate-spin text-amber-400 [animation-duration:3s]" aria-hidden="true" />
                <span className="relative text-sm text-white/70">Chargement de la visite 360°…</span>
              </div>
            )}
            {phase === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#0B0B0C] px-6 text-center" role="alert">
                <p className="font-serif text-2xl text-white sm:text-3xl">La visite n’a pas pu se charger.</p>
                <p className="max-w-sm text-sm text-white/65">Vous pouvez réessayer ou l’ouvrir directement dans un nouvel onglet.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={retry} className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-400 px-6 text-sm font-semibold text-black">
                    <RotateCw className="size-4" aria-hidden="true" /> Réessayer
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold text-white">
                    Ouvrir la visite <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                key={attempt}
                src={url}
                title={title}
                loading="lazy"
                allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => {
                  clearTimer();
                  setPhase('ready');
                }}
                onError={() => {
                  clearTimer();
                  setPhase('error');
                }}
                className="absolute inset-0 size-full border-0"
              />
            )}
          </>
        )}
      </div>

      {/* Controls are OUTSIDE the frame: they never cover the tour's own controls or watermark. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (phase === 'idle') start();
              toggleFullscreen();
            }}
            aria-pressed={isFullscreen}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-current/25 px-5 font-medium opacity-90 transition hover:border-amber-400 hover:text-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {isFullscreen ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
            {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 font-medium opacity-80 underline-offset-4 transition hover:text-amber-400 hover:underline focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Ouvrir dans un nouvel onglet
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
          </a>
        </div>
        <p className="text-xs opacity-60">
          Visite 360° · <span>{hostOf(url)}</span>
        </p>
      </div>
    </div>
  );
}
