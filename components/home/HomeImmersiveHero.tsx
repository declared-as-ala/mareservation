'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { getVenueHref } from '@/lib/venueHref';
import type { Venue } from '@/lib/api/types';
import {
  MapPin, Utensils, Coffee, BedDouble, Sparkles, Wine, Clapperboard, Laptop,
  Star, ArrowRight, Search, CalendarDays, Users, Globe, ShieldCheck, Armchair,
  UtensilsCrossed, Martini, PartyPopper, Briefcase, Flower2,
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
  { title: 'Restauration', subtitle: 'Restaurants • Cafés', href: '/restaurants', Icon: UtensilsCrossed },
  { title: 'Sorties', subtitle: 'Bars • Rooftops • Clubs', href: '/explorer?q=Bar', Icon: Martini },
  { title: 'Événements', subtitle: 'Concerts • Festivals', href: '/evenements', Icon: PartyPopper },
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

  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const item = el.querySelector('[data-card]') as HTMLElement | null;
    const w = item?.offsetWidth ?? el.clientWidth / 3;
    setIdx(Math.round(el.scrollLeft / (w + 10)));
  };

  const goTo = (i: number) => {
    const el = railRef.current;
    if (!el) return;
    const item = el.querySelector('[data-card]') as HTMLElement | null;
    const w = item?.offsetWidth ?? 110;
    el.scrollTo({ left: i * (w + 10), behavior: 'smooth' });
  };

  return (
    <section className="relative flex h-[100svh] flex-col overflow-hidden bg-[#0B0B0C] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[88px] sm:pt-[96px] md:hidden">
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
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? 'w-4 bg-amber-400' : 'w-1.5 bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>

      {/* ── Zone 2 · Catégories (flex-1 fills the slack) ── */}
      <div className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col">
        <SectionHead
          eyebrow="Accès rapide"
          title={<>Établissements <span className="text-amber-400">disponibles</span> <Spark /></>}
        />
        <div className="mt-2 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2">
          {CATEGORIES.map(({ title, subtitle, href, Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101011] p-1 text-center transition-all duration-300 hover:border-amber-400/30 hover:bg-[#161616] active:scale-95"
            >
              <Icon className="size-6 shrink-0 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.45)] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.6} />
              <span className="text-[11px] font-bold leading-none text-white group-hover:text-amber-200">{title}</span>
              <span className="max-w-full truncate text-[8px] leading-tight text-zinc-500">{subtitle}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Zone 3 · Immersive 360 + booking search ── */}
      <div className="relative z-10 mt-2 shrink-0 overflow-hidden rounded-3xl border border-amber-400/[0.14] bg-gradient-to-br from-[#17120a] via-[#0f0f10] to-[#0a0a0b] p-3.5">
        {/* orb top-right */}
        <div aria-hidden className="pointer-events-none absolute -right-5 -top-3">
          <Orb size={74} />
        </div>

        <div className="relative">
          <Eyebrow>Immersive</Eyebrow>
          <h2 className="mt-1.5 max-w-[80%] font-serif text-[18px] font-black leading-[1.12] tracking-tight text-white">
            Réservez ce que{' '}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">vous voyez</span>, en 360°.
          </h2>

          <p className="mt-1.5 max-w-[88%] text-[11px] leading-snug text-white/55">
            Choisissez votre table directement dans la vue — réservez en quelques secondes.
          </p>

          <Link
            href="/explorer"
            className="group mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.32)] transition-all active:scale-[0.98]"
          >
            Réserver maintenant
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* features */}
          <div className="mt-3 flex items-stretch gap-1.5">
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} className="flex flex-1 items-center gap-1 rounded-lg border border-white/[0.06] bg-black/30 px-1.5 py-1">
                <Icon className="size-3 shrink-0 text-amber-400" strokeWidth={1.8} />
                <span className="text-[8px] font-medium leading-[1.05] text-white/60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DESKTOP — dense premium hero (one screen) + categories strip
   ═══════════════════════════════════════════════════════════════ */
function DesktopScreen({ venues }: { venues: CardVenue[] }) {
  const [big, ...rest] = venues;
  const small = rest.slice(0, 2);

  return (
    <section className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-[#0B0B0C] pt-[92px] md:flex">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-[440px] w-[440px] rounded-full bg-amber-600/[0.045] blur-[130px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

      {/* HERO */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-[1.08fr_0.92fr] items-center gap-10 px-8 py-8 lg:gap-14 lg:px-10">
        {/* LEFT — copy + search */}
        <div className="flex flex-col">
          <Eyebrow>Immersive · 360°</Eyebrow>
          <h1 className="mt-5 font-serif text-[44px] font-black leading-[1.04] tracking-tight text-white lg:text-[56px]">
            Réservez ce que{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">vous voyez</span>,
            <br />en 360°.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
            Explorez cafés, restaurants, hôtels et événements en visite virtuelle.
            Choisissez votre table directement dans la vue — puis réservez en quelques secondes.
          </p>

          <div className="mt-7 max-w-2xl">
            <BookingSearch variant="desktop" />
          </div>

          {/* feature chips */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-2 pr-3.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-400/[0.12]">
                  <Icon className="size-3 text-amber-400" strokeWidth={1.9} />
                </span>
                <span className="text-[12px] font-medium text-white/65">{label}</span>
              </div>
            ))}
          </div>

          {/* mini trust stats */}
          <div className="mt-7 flex items-center gap-7">
            {[['500+', 'Lieux'], ['12k+', 'Réservations'], ['4.9★', 'Satisfaction']].map(([v, l]) => (
              <div key={l}>
                <div className="font-serif text-xl font-bold text-amber-400">{v}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — orb + featured venue bento */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 animate-[spin_36s_linear_infinite] rounded-full border border-amber-400/[0.06]" />
            <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 animate-[spin_24s_linear_infinite_reverse] rounded-full border border-amber-400/[0.09]" />
          </div>

          <div className="relative grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">Recommandé pour vous</span>
              <Link href="/explorer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-400 transition-colors hover:text-amber-300">
                Tout voir <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {big && <DesktopVenueCard venue={big} featured />}
            <div className="grid grid-cols-2 gap-3">
              {small.map((v) => <DesktopVenueCard key={v._id} venue={v} />)}
            </div>
          </div>

          {/* floating 360 orb badge */}
          <div aria-hidden className="absolute -right-3 -top-3 z-20">
            <Orb size={84} />
          </div>
        </div>
      </div>

      {/* CATEGORIES strip — pinned to the bottom of the hero */}
      <div className="relative z-10 border-t border-white/[0.06] bg-[#0c0c0d]/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-8 py-4 lg:px-10">
          <div className="shrink-0 pr-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Accès rapide</p>
            <p className="text-sm font-bold text-white">Établissements</p>
          </div>
          <div className="grid flex-1 grid-cols-6 gap-2.5">
            {CATEGORIES.map(({ title, subtitle, href, Icon }) => (
              <Link
                key={title}
                href={href}
                className="group flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[#111112] px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 hover:bg-[#161616]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/[0.1] transition-colors group-hover:bg-amber-400/[0.18]">
                  <Icon className="size-4 text-amber-400" strokeWidth={1.7} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold leading-tight text-white group-hover:text-amber-200">{title}</span>
                  <span className="block truncate text-[10px] leading-tight text-zinc-500">{subtitle}</span>
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
function BookingSearch({ variant }: { variant: 'mobile' | 'desktop' }) {
  const router = useRouter();
  const [dest, setDest] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('2');
  const today = new Date().toISOString().split('T')[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (dest.trim()) p.set('q', dest.trim());
    if (date) p.set('date', date);
    if (guests) p.set('guests', guests);
    const qs = p.toString();
    router.push(`/explorer${qs ? `?${qs}` : ''}`);
  };

  const guestOptions = ['1', '2', '3', '4', '5', '6', '8'];

  if (variant === 'mobile') {
    return (
      <form onSubmit={submit} className="mt-2 space-y-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/80" />
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="Où souhaitez-vous aller ?"
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-[13px] text-white placeholder:text-white/40 outline-none transition-colors focus:border-amber-400/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/80" />
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-2 text-[12px] text-white outline-none transition-colors [color-scheme:dark] focus:border-amber-400/50"
            />
          </div>
          <div className="relative">
            <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/80" />
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-black/40 pl-9 pr-2 text-[12px] text-white outline-none transition-colors focus:border-amber-400/50"
            >
              {guestOptions.map((g) => (
                <option key={g} value={g} className="bg-zinc-900">{g} {g === '1' ? 'invité' : 'invités'}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.32)] transition-all active:scale-[0.98]"
        >
          Réserver maintenant
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    );
  }

  /* desktop — horizontal pill */
  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/80" />
        <input
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          placeholder="Où souhaitez-vous aller ?"
          className="h-11 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none"
        />
      </div>
      <div className="h-7 w-px bg-white/10" />
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/80" />
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 w-[150px] rounded-xl bg-transparent pl-9 pr-2 text-sm text-white outline-none [color-scheme:dark]"
        />
      </div>
      <div className="h-7 w-px bg-white/10" />
      <div className="relative">
        <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/80" />
        <select
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className="h-11 w-[120px] appearance-none rounded-xl bg-transparent pl-9 pr-2 text-sm text-white outline-none"
        >
          {guestOptions.map((g) => (
            <option key={g} value={g} className="bg-zinc-900">{g} {g === '1' ? 'invité' : 'invités'}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="group ml-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 text-sm font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.30)] transition-all hover:-translate-y-0.5"
      >
        Réserver maintenant
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}

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
          {typeof venue.rating === 'number' && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-400/20 bg-black/60 px-2 py-1 backdrop-blur-md">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300">{venue.rating}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Decorative 360° orb ─── */
function Orb({ size }: { size: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-amber-500/[0.18] blur-2xl" />
      <div
        className="relative flex items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-400/15 via-amber-500/[0.08] to-transparent shadow-[0_0_40px_rgba(245,158,11,0.25)]"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-25">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fbbf24" strokeWidth="0.7" />
          <ellipse cx="50" cy="50" rx="30" ry="46" fill="none" stroke="#fbbf24" strokeWidth="0.6" />
          <ellipse cx="50" cy="50" rx="46" ry="20" fill="none" stroke="#fbbf24" strokeWidth="0.6" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="#fbbf24" strokeWidth="0.6" />
          <line x1="50" y1="4" x2="50" y2="96" stroke="#fbbf24" strokeWidth="0.6" />
        </svg>
        <span
          className="relative font-serif font-black text-amber-400 drop-shadow-[0_0_14px_rgba(245,158,11,0.9)]"
          style={{ fontSize: size * 0.22 }}
        >
          360°
        </span>
      </div>
    </div>
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
