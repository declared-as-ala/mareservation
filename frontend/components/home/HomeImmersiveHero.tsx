'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { getVenueHref } from '@/lib/venueHref';
import type { Venue } from '@/lib/api/types';
import {
  MapPin, Utensils, Coffee, BedDouble, Sparkles, Wine, Clapperboard, Laptop,
  ArrowRight, Globe, ShieldCheck, Armchair,
  UtensilsCrossed, Martini, PartyPopper, Briefcase, Flower2, Play,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Fallback venue data (used only when the API returns < 2 items)
   ───────────────────────────────────────────────────────────── */
const MOCK_VENUES = [
  { _id: 'mock-1', name: 'Dar El Marsa', city: 'La Marsa, Tunis', type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=900&auto=format&fit=crop',
    slug: 'dar-el-marsa', hasVirtualTour: true, rating: 4.9, reviews: 284 },
  { _id: 'mock-2', name: 'Azura Palace Hotel', city: 'Hammamet', type: 'HOTEL',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=900&auto=format&fit=crop',
    slug: 'azura-palace-hotel', hasVirtualTour: true, rating: 4.8, reviews: 192 },
  { _id: 'mock-3', name: 'Sunset Beach Bar', city: 'Sousse', type: 'CAFE',
    coverImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop',
    slug: 'sunset-beach-bar', hasVirtualTour: true, rating: 4.7, reviews: 156 },
  { _id: 'mock-4', name: 'Le Chalet Carthage', city: 'Carthage, Tunis', type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop',
    slug: 'le-chalet-carthage', hasVirtualTour: true, rating: 4.8, reviews: 218 },
  { _id: 'mock-5', name: 'Sidi Bou Rooftop', city: 'Sidi Bou Saïd', type: 'CAFE',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop',
    slug: 'sidi-bou-rooftop', hasVirtualTour: false, rating: 4.6, reviews: 134 },
  { _id: 'mock-6', name: 'Le Zéphyr Tunis', city: 'Tunis Centre', type: 'RESTAURANT',
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=900&auto=format&fit=crop',
    slug: 'le-zephyr-tunis', hasVirtualTour: true, rating: 4.9, reviews: 307 },
] as unknown as Venue[];

type CardVenue = Venue & { hasVirtualTour?: boolean; rating?: number; reviews?: number };

function getCategoryInfo(type?: string, name = '') {
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

/* ─── Category quick-access tiles ─── */
const CATEGORIES = [
  { title: 'Hébergement', subtitle: "Hôtels • Maisons d'hôtes", href: '/hotels', Icon: BedDouble },
  { title: 'Restauration', subtitle: 'Restaurants • Cafés', href: '/restauration', Icon: UtensilsCrossed },
  { title: 'Sorties', subtitle: 'Bars • Rooftops • Clubs', href: '/explorer?q=Bar', Icon: Martini },
  { title: 'Événements', subtitle: 'Concerts • Festivals • Sport', href: '/evenements', Icon: PartyPopper },
  { title: 'Business', subtitle: 'Réunions • Coworking', href: '/coworking', Icon: Briefcase },
  { title: 'Bien-être', subtitle: 'Spas • Piscines', href: '/explorer?q=Spa', Icon: Flower2 },
];

/* ─── Immersive feature highlights ─── */
const FEATURES = [
  { Icon: Globe, label: 'Visite virtuelle 360°' },
  { Icon: Armchair, label: 'Votre table dans la vue' },
  { Icon: ShieldCheck, label: 'Réservation sécurisée' },
];

/* ═══════════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════════ */
export function HomeImmersiveHero() {
  const { data: realVenues = [] } = useQuery({
    queryKey: ['public-recommended-venues'],
    queryFn: () => fetchVenues({ isFeatured: true }),
    staleTime: 5 * 60 * 1000,
  });

  const venues: CardVenue[] = (
    realVenues.length >= 2
      ? realVenues.slice(0, 9)
      : [...realVenues, ...MOCK_VENUES.filter((m) => !realVenues.some((r) => r.name === m.name))].slice(0, 6)
  ) as CardVenue[];

  return (
    <>
      <MobileScreen venues={venues} />
      <DesktopScreen venues={venues} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE — single viewport, no vertical scroll
   ═══════════════════════════════════════════════════════════════ */
function MobileScreen({ venues }: { venues: CardVenue[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = venues.slice(0, 6).length;

  const goTo = useCallback((i: number) => {
    const el = railRef.current;
    if (!el) return;
    const item = el.querySelector('[data-card]') as HTMLElement | null;
    const w = item?.offsetWidth ?? 110;
    el.scrollTo({ left: i * (w + 10), behavior: 'smooth' });
    setIdx(i);
  }, []);

  // Auto-rotate every 3s
  useEffect(() => {
    if (paused || total < 2) return;
    const timer = setInterval(() => {
      setIdx((current) => {
        const next = (current + 1) % total;
        const el = railRef.current;
        if (el) {
          const item = el.querySelector('[data-card]') as HTMLElement | null;
          const w = item?.offsetWidth ?? 110;
          el.scrollTo({ left: next * (w + 10), behavior: 'smooth' });
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [paused, total]);

  // Pause when tab is hidden — avoid wasted work
  useEffect(() => {
    function onVis() {
      setPaused(document.hidden);
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const item = el.querySelector('[data-card]') as HTMLElement | null;
    const w = item?.offsetWidth ?? el.clientWidth / 3;
    setIdx(Math.round(el.scrollLeft / (w + 10)));
  };

  const pauseTemporarily = () => {
    setPaused(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setPaused(false), 4000);
  };

  return (
    <section className="relative flex h-[100svh] flex-col overflow-hidden bg-[#0B0B0C] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[96px] sm:pt-[104px] md:hidden">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-10 h-56 w-56 rounded-full bg-amber-500/[0.07] blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute -left-16 bottom-1/3 h-48 w-48 rounded-full bg-amber-600/[0.05] blur-[70px]" />

      {/* ── Zone 1 · Recommandé ── */}
      <div className="relative z-10 shrink-0">
        <SectionHead
          title={<>Recommandé pour vous <Spark /></>}
          sub="Découvrez nos meilleures adresses"
        />
        <div
          ref={railRef}
          onScroll={onScroll}
          onTouchStart={pauseTemporarily}
          onPointerDown={pauseTemporarily}
          className="no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-4"
        >
          {venues.map((v) => (
            <div key={v._id} data-card className="w-[31%] shrink-0 snap-start">
              <MobileVenueCard venue={v} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {venues.slice(0, 6).map((_, i) => (
            <button
              key={i}
              aria-label={`Aller au lieu ${i + 1}`}
              onClick={() => {
                pauseTemporarily();
                goTo(i);
              }}
              className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                idx === i ? 'w-7 bg-zinc-700/70' : 'w-1.5 bg-zinc-700'
              }`}
            >
              {idx === i && !paused && (
                <span
                  key={`p-${i}-${idx}`}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-500"
                  style={{ animation: 'autoRotateBar 3s linear forwards' }}
                />
              )}
              {idx === i && paused && (
                <span className="absolute inset-0 bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Zone 2 · Catégories — 4 par ligne (compact) ── */}
      <div className="relative z-10 mt-1.5 shrink-0">
        <SectionHead
          eyebrow="Accès rapide"
          title={<>Explorer par <span className="text-amber-400">catégorie</span> <Spark /></>}
        />
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {CATEGORIES.map(({ title, subtitle, href, Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#141414] to-[#0e0e0e] px-1.5 py-2 text-center transition-all duration-300 hover:border-amber-400/35 hover:from-[#1a1610] hover:to-[#121212] active:scale-95"
            >
              <span className="flex size-6 items-center justify-center rounded-lg bg-amber-400/[0.10] text-amber-400 transition-all group-hover:bg-amber-400/[0.18] group-hover:shadow-[0_0_14px_rgba(245,158,11,0.30)]">
                <Icon className="size-3" strokeWidth={1.8} />
              </span>
              <span className="text-[10px] font-bold leading-none text-white group-hover:text-amber-200">{title}</span>
              <span className="line-clamp-1 text-[8px] font-medium leading-tight text-white/40">{subtitle}</span>
            </Link>
          ))}
          {/* Tout voir */}
          <Link
            href="/explorer"
            className="group flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-1.5 py-2 text-center transition-all duration-300 hover:border-amber-400/55 hover:bg-amber-400/[0.10] active:scale-95"
          >
            <span className="flex size-6 items-center justify-center rounded-lg bg-amber-400/[0.18] text-amber-300">
              <ArrowRight className="size-3" strokeWidth={2} />
            </span>
            <span className="text-[10px] font-bold leading-none text-amber-300">Tout</span>
            <span className="line-clamp-1 text-[8px] font-medium leading-tight text-amber-300/50">Tout voir</span>
          </Link>
        </div>
      </div>

      {/* ── Zone 3 · Immersive booking CTA (compact premium) ── */}
      <MobileImmersiveCTA />
    </section>
  );
}

/* ─── Mobile immersive CTA — modern, compact, CTA above the fold ─── */
function MobileImmersiveCTA() {
  return (
    <div className="relative z-10 mt-2 shrink-0">
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,158,11,0.45)_0%,rgba(180,83,9,0.15)_28%,#0d0d0e_55%,#080809_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(245,158,11,0.22)]">
        {/* Subtle diagonal mesh */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(245,158,11,0.5) 25%, transparent 25%, transparent 75%, rgba(245,158,11,0.5) 75%, rgba(245,158,11,0.5)), linear-gradient(45deg, rgba(245,158,11,0.5) 25%, transparent 25%, transparent 75%, rgba(245,158,11,0.5) 75%, rgba(245,158,11,0.5))',
            backgroundSize: '14px 14px',
            backgroundPosition: '0 0, 7px 7px',
          }}
        />
        {/* Glow blobs */}
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-400/[0.28] blur-[60px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-amber-600/[0.16] blur-[50px]" />

        <div className="relative p-3.5">
          {/* Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/[0.10] px-2 py-0.5 backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">
              Plateforme immersive
            </span>
          </div>

          {/* Heading */}
          <h2 className="mt-1.5 font-serif text-[20px] font-black leading-[1.08] tracking-tight text-white">
            Visitez. Choisissez.{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Réservez.
            </span>
          </h2>
          <p className="mt-1 text-[10.5px] leading-snug text-white/55">
            Explorez en immersion, choisissez votre table — réservez en quelques secondes.
          </p>

          {/* Primary CTA — large, always visible */}
          <Link
            href="/explorer"
            className="group relative mt-2.5 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-[15px] font-black text-black shadow-[0_10px_28px_rgba(245,158,11,0.45)] transition-all active:scale-[0.98]"
          >
            <span className="relative z-10">Réserver maintenant</span>
            <ArrowRight className="relative z-10 size-4 transition-transform group-active:translate-x-1" />
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </Link>

          {/* Trust strip */}
          <div className="mt-2 flex items-center justify-between text-[8.5px] font-medium text-white/55">
            <span className="inline-flex items-center gap-1">
              <Globe className="size-2.5 text-amber-400" strokeWidth={2} />
              Immersif
            </span>
            <span className="inline-flex items-center gap-1">
              <Armchair className="size-2.5 text-amber-400" strokeWidth={2} />
              Table choisie
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-2.5 text-amber-400" strokeWidth={2} />
              Sécurisé
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DESKTOP — dense premium hero (one screen) + categories strip
   ═══════════════════════════════════════════════════════════════ */
function DesktopScreen({ venues }: { venues: CardVenue[] }) {
  return (
    <section className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-[#0B0B0C] pt-[96px] md:flex lg:pt-[108px]">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-[440px] w-[440px] rounded-full bg-amber-600/[0.045] blur-[130px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

      {/* HERO */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-[1.1fr_0.9fr] items-center gap-6 px-5 py-3 md:gap-8 md:px-8 lg:gap-12 lg:px-10 lg:py-5">
        {/* LEFT — modern cinematic copy */}
        <div className="flex flex-col">
          {/* Eyebrow with live dot */}
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-400/[0.10] to-amber-500/[0.04] px-3 py-1.5 backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
              Plateforme immersive · 360°
            </span>
          </div>

          {/* Headline with gradient + animated underline */}
          <h1 className="mt-3 font-serif text-[28px] font-black leading-[1.02] tracking-tight text-white md:text-[34px] lg:text-[44px] xl:text-[52px]">
            Réservez ce que{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                vous voyez
              </span>
              <span aria-hidden className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400/80 to-amber-400/0" />
            </span>
            ,<br />en{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              360°
            </span>
            .
          </h1>

          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-white/60 lg:text-[15px]">
            Explorez cafés, restaurants, hôtels et événements en visite virtuelle immersive.
            Choisissez votre table directement dans la vue — puis réservez en quelques secondes.
          </p>

          {/* Modern CTA group */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/explorer"
              className="group relative inline-flex h-[50px] items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-7 text-[15px] font-black text-black shadow-[0_12px_32px_rgba(245,158,11,0.40)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(245,158,11,0.55)]"
            >
              <span className="relative z-10">Réserver maintenant</span>
              <ArrowRight className="relative z-10 size-[18px] transition-transform group-hover:translate-x-1" />
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <Link
              href="/comment-ca-marche"
              className="group inline-flex h-[50px] items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-amber-400/40 hover:bg-amber-400/[0.06] hover:text-white"
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-white/20 bg-white/[0.05] transition-colors group-hover:border-amber-400/50 group-hover:bg-amber-400/[0.10]">
                <Play className="size-2.5 fill-current" />
              </span>
              Comment ça marche
            </Link>
          </div>

          {/* feature pills + stats merged */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.07] pt-4">
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-2 text-[12px] font-medium text-white/65">
                <span className="flex size-7 items-center justify-center rounded-xl bg-amber-400/[0.10] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]">
                  <Icon className="size-3.5 text-amber-400" strokeWidth={1.9} />
                </span>
                {label}
              </div>
            ))}
          </div>

          {/* mini trust stats inline */}
          <div className="mt-3 flex items-center gap-6">
            {[['500+', 'Lieux'], ['12k+', 'Réservations'], ['4.9★', 'Satisfaction']].map(([v, l], i) => (
              <div key={l} className="flex items-center gap-3">
                {i > 0 && <span className="h-6 w-px bg-white/[0.08]" />}
                <div>
                  <div className="font-serif text-lg font-black leading-none text-amber-400">{v}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — auto-rotating featured venue (real-time, 3s/slide) */}
        <div className="relative">
          <DesktopAutoFeatured venues={venues.slice(0, 6)} />
        </div>
      </div>

      {/* CATEGORIES grid — pinned to the bottom of the hero */}
      <div className="relative z-10 border-t border-white/[0.06] bg-[#0c0c0d]/60 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl px-8 py-3 lg:px-10 lg:py-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400/85">
              Accès rapide · Catégories
            </p>
            <Link
              href="/explorer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/55 transition-colors hover:text-amber-300"
            >
              Tout explorer <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 md:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map(({ title, subtitle, href, Icon }) => (
              <Link
                key={title}
                href={href}
                className="group flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-[#111112] px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/35 hover:bg-gradient-to-br hover:from-[#1a1610] hover:to-[#111112] hover:shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_0_1px_rgba(245,158,11,0.12)]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/[0.10] transition-all group-hover:bg-amber-400/[0.20] group-hover:shadow-[0_0_22px_rgba(245,158,11,0.35)]">
                  <Icon className="size-4 text-amber-400" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold leading-tight text-white group-hover:text-amber-200">
                    {title}
                  </span>
                  <span className="block truncate text-[10px] leading-tight text-zinc-500">
                    {subtitle}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared pieces
   ═══════════════════════════════════════════════════════════════ */
/* (Booking search removed — home now uses a single "Réserver maintenant" CTA on
   both mobile and desktop, routing into the immersive /explorer experience.) */

/* ─── Mobile venue card (compact landscape) ─── */
function MobileVenueCard({ venue }: { venue: CardVenue }) {
  const { label, Icon } = getCategoryInfo(venue.type, venue.name);
  return (
    <Link
      href={getVenueHref(venue)}
      className="group block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111112] transition-all duration-300 hover:border-amber-400/30 active:scale-95"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
        {venue.coverImage ? (
          <Image src={venue.coverImage} alt={venue.name} fill sizes="33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><Icon className="size-6 text-zinc-700" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-1.5 py-0.5 backdrop-blur-sm">
          <Icon className="size-2.5 text-amber-400" />
          <span className="text-[8px] font-bold uppercase tracking-wide text-white">{label}</span>
        </div>
        {venue.hasVirtualTour && (
          <span className="absolute right-1.5 top-1.5 rounded-full border border-amber-400/25 bg-black/65 px-1.5 py-0.5 text-[8px] font-black tracking-wide text-amber-300 backdrop-blur-sm">360°</span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-[12px] font-bold leading-tight text-white group-hover:text-amber-200">{venue.name}</p>
        {venue.city && (
          <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-amber-400/90">
            <MapPin className="size-2.5 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Desktop auto-rotating featured card ─── */
function DesktopAutoFeatured({ venues }: { venues: CardVenue[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = venues.length;

  useEffect(() => {
    if (paused || total < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), 3000);
    return () => clearInterval(t);
  }, [paused, total]);

  useEffect(() => {
    function onVis() {
      setPaused(document.hidden);
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (total === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stacked crossfade */}
      <div className="relative aspect-[16/11] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950 shadow-[0_30px_80px_rgba(0,0,0,0.55)] lg:aspect-[4/3]">
        {venues.map((v, i) => {
          const { label, Icon } = getCategoryInfo(v.type, v.name);
          const active = i === idx;
          return (
            <Link
              key={v._id}
              href={getVenueHref(v)}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={`absolute inset-0 block transition-opacity duration-[1100ms] ease-out ${
                active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {v.coverImage ? (
                <Image
                  src={v.coverImage}
                  alt={v.name}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 50vw, 560px"
                  className={`object-cover ${active ? 'animate-[autoKenBurns_4.5s_ease-out_forwards]' : ''}`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <Icon className="size-14 text-zinc-700" />
                </div>
              )}

              {/* Gradient layers */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-transparent" />

              {/* Top-left: category */}
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 backdrop-blur-md">
                <Icon className="size-3.5 text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">{label}</span>
              </div>

              {/* Top-right: 360 badge */}
              {v.hasVirtualTour && (
                <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/65 px-2.5 py-1.5 text-[11px] font-black tracking-wider text-amber-300 backdrop-blur-md">
                  360°
                </div>
              )}

              {/* Bottom content */}
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-serif text-[26px] font-black leading-tight tracking-tight text-white drop-shadow-lg">
                  {v.name}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-white/80">
                  {v.city && (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <MapPin className="size-3.5" /> {v.city}
                    </span>
                  )}
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.32)]">
                  Découvrir
                  <ArrowRight className="size-3.5" />
                </div>
              </div>
            </Link>
          );
        })}

        {/* Segmented progress bar */}
        <div className="absolute inset-x-4 top-4 z-10 flex gap-1.5">
          {venues.map((_, i) => {
            const filled = i < idx;
            const active = i === idx;
            return (
              <button
                key={i}
                aria-label={`Aller au lieu ${i + 1}`}
                onClick={() => setIdx(i)}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15"
              >
                {filled && <span className="absolute inset-0 bg-amber-400/85" />}
                {active && !paused && (
                  <span
                    key={`seg-${i}-${idx}`}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300 to-amber-500"
                    style={{ animation: 'autoRotateBar 3s linear forwards' }}
                  />
                )}
                {active && paused && <span className="absolute inset-0 bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thumbnails strip */}
      <div className="mt-2.5 grid grid-cols-6 gap-1.5">
        {venues.map((v, i) => {
          const active = i === idx;
          return (
            <button
              key={v._id}
              onClick={() => setIdx(i)}
              aria-label={`Voir ${v.name}`}
              className={`group/thumb relative aspect-[5/4] overflow-hidden rounded-xl border transition-all duration-300 ${
                active
                  ? 'border-amber-400/60 ring-2 ring-amber-400/30'
                  : 'border-white/[0.08] opacity-60 hover:border-white/25 hover:opacity-100'
              }`}
            >
              {v.coverImage && (
                <Image src={v.coverImage} alt={v.name} fill sizes="80px" className="object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Desktop venue card (bento) ─── */
function DesktopVenueCard({ venue, featured = false }: { venue: CardVenue; featured?: boolean }) {
  const { label, Icon } = getCategoryInfo(venue.type, venue.name);
  return (
    <Link
      href={getVenueHref(venue)}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950 transition-all duration-500 hover:border-amber-400/35 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
    >
      <div className={`relative w-full overflow-hidden ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
        {venue.coverImage ? (
          <Image src={venue.coverImage} alt={venue.name} fill sizes={featured ? '480px' : '240px'} className="object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900"><Icon className="size-10 text-zinc-700" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md">
          <Icon className="size-3 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-white">{label}</span>
        </div>
        {venue.hasVirtualTour && (
          <span className="absolute right-2.5 top-2.5 rounded-full border border-amber-400/30 bg-black/70 px-2 py-1 text-[10px] font-black tracking-wide text-amber-300 backdrop-blur-md">360°</span>
        )}
        {/* bottom info overlaid */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <div className="min-w-0">
            <h3 className={`truncate font-bold text-white group-hover:text-amber-200 ${featured ? 'text-base' : 'text-[13px]'}`}>{venue.name}</h3>
            {venue.city && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-400/85">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{venue.city}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Small typographic helpers ─── */
function Spark() {
  return <span className="text-amber-400" aria-hidden>✦</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-400/35 bg-amber-400/[0.08] px-2.5 py-1">
      <span className="text-[11px] leading-none text-amber-400">✦</span>
      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">{children}</span>
    </span>
  );
}

function SectionHead({
  eyebrow, title, sub,
}: { eyebrow?: string; title: React.ReactNode; sub?: string }) {
  return (
    <div>
      {eyebrow && <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p>}
      <h2 className="flex items-center gap-1.5 text-[17px] font-bold leading-tight text-white">{title}</h2>
      {sub && <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{sub}</p>}
    </div>
  );
}
