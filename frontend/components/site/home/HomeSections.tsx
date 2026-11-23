'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  ArrowRight, BedDouble, ChevronLeft, ChevronRight, Eye, Gem, Heart, Landmark, MapPin, Monitor, Mountain, Rotate3d,
  ShieldCheck, Sunset, Trees, Users, Wallet, Waves, Zap, Baby,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { SearchBar } from '@/components/site/SearchBar';
import { TourViewer } from '@/components/exploria/TourViewer';
import type { SearchResult } from '@/lib/api/bookings';
import type { Venue } from '@/lib/api/types';
import { formatMoney } from '@/lib/booking/dates';
import { cn } from '@/lib/utils';

/** Category → real Explorer filter (only attributes the backend actually filters on). */
export const CATEGORIES = [
  { label: 'Bord de mer', icon: Waves, query: 'features=beachfront' },
  { label: 'Moins de 200 DT', icon: Wallet, query: 'maxPrice=200' },
  { label: 'Avec piscine', icon: Waves, query: 'features=pool' },
  { label: 'Traditionnel', icon: Landmark, query: 'features=traditional' },
  { label: 'À la montagne', icon: Mountain, query: 'features=mountain_view' },
  { label: 'Luxe', icon: Gem, query: 'features=luxury' },
  { label: 'En famille', icon: Baby, query: 'features=family_friendly' },
  { label: 'Romantique', icon: Heart, query: 'features=romantic' },
  { label: 'Avec jardin', icon: Trees, query: 'features=garden' },
  { label: 'Vue sur mer', icon: Sunset, query: 'features=sea_view' },
  { label: 'Avec visite 360°', icon: Rotate3d, query: 'tour=1' },
  { label: 'Réservation instantanée', icon: Zap, query: 'instant=1' },
];

export function CategoryRail({ activeQuery, className }: { activeQuery?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 320, behavior: 'smooth' });
  return (
    <div className={cn('relative', className)}>
      <div ref={ref} className="flex snap-x gap-2 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(({ label, icon: Icon, query }) => {
          const active = activeQuery === query;
          return (
            <Link key={label} href={`/accommodations?${query}`} aria-current={active ? 'true' : undefined}
              className={cn('group flex min-w-[6.75rem] shrink-0 snap-start flex-col items-center gap-2 border-b-2 px-3 pb-3 pt-2 text-center transition-colors',
                active ? 'border-amber-400 text-amber-200' : 'border-transparent text-neutral-400 hover:border-white/30 hover:text-white')}>
              <Icon className={cn('size-6 stroke-[1.4]', active ? 'text-amber-300' : 'text-neutral-300 group-hover:text-amber-300')} aria-hidden="true" />
              <span className="whitespace-nowrap text-xs font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
      <button type="button" aria-label="Catégories précédentes" onClick={() => scroll(-1)} className="absolute -start-3 top-4 hidden size-9 place-items-center rounded-full border border-white/15 bg-[#111112] text-white shadow-lg hover:border-amber-400 lg:grid rtl:rotate-180"><ChevronLeft className="size-4" /></button>
      <button type="button" aria-label="Catégories suivantes" onClick={() => scroll(1)} className="absolute -end-3 top-4 hidden size-9 place-items-center rounded-full border border-white/15 bg-[#111112] text-white shadow-lg hover:border-amber-400 lg:grid rtl:rotate-180"><ChevronRight className="size-4" /></button>
    </div>
  );
}

export function HomeHero() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="hero-title" className="on-dark relative flex min-h-[640px] items-center justify-center overflow-hidden pt-[4.5rem] text-white md:h-[82vh] md:max-h-[880px] md:min-h-[620px]">
      <picture>
        <source media="(max-width: 767px)" srcSet="/demo/hero-960.webp" type="image/webp" />
        <source srcSet="/demo/hero.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/hero.jpg" alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/60" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center px-4 pb-12 text-center sm:px-6 lg:px-10">
        <h1 id="hero-title" className="max-w-4xl font-serif text-[clamp(2.3rem,6vw,4.6rem)] font-medium leading-[1.04] [text-shadow:0_4px_30px_rgba(0,0,0,0.45)]">
          {t('hero.title')}
          <span className="mt-2 block bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-[0.62em] italic text-transparent">{t('hero.subtitle')}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{t('hero.lead')}</p>
        <div className="mt-9 flex w-full justify-center"><SearchBar variant="hero" /></div>
      </div>
    </section>
  );
}

export function PropertyCardMini({ r }: { r: SearchResult }) {
  const { t } = useI18n();
  return (
    <Link href={`/accommodation/${r.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 rounded-[1.4rem]">
      <div className="on-dark relative aspect-[4/3.4] overflow-hidden rounded-[1.4rem] bg-[#161617]">
        {r.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.coverImage} alt={`${r.name}`} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          {r.isDemo && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">{t('card.demo')}</span>}
          {r.hasVirtualTour && <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300 backdrop-blur"><Rotate3d className="size-3" aria-hidden="true" />360°</span>}
          {r.instantBooking && <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur"><Zap className="size-3 text-amber-300" aria-hidden="true" />{t('card.instant')}</span>}
        </div>
      </div>
      <div className="px-1 pt-3.5">
        <p className="flex items-center gap-1 text-xs text-neutral-400"><MapPin className="size-3.5 text-amber-400" aria-hidden="true" />{[r.city, r.governorate && r.governorate !== r.city ? r.governorate : null].filter(Boolean).join(', ')}</p>
        <h3 className="mt-1 line-clamp-1 font-serif text-[1.2rem] text-white transition-colors group-hover:text-amber-100">{r.name}</h3>
        <p className="mt-1 flex gap-3 text-xs text-neutral-400">
          {r.maxGuests != null && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{r.maxGuests} {t('card.guests')}</span>}
          {r.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble className="size-3.5" aria-hidden="true" />{r.bedrooms} {t('card.bedrooms')}</span>}
        </p>
        <p className="mt-2 text-sm text-neutral-400">
          {r.fromPrice != null ? <>{t('card.from')} <span className="font-bold text-white">{formatMoney(r.fromPrice)}</span> / {t('card.night')}</> : <span>{r.bookable ? '' : '—'}</span>}
        </p>
      </div>
    </Link>
  );
}

const CURATED = ['Hammamet', 'Sousse', 'Monastir', 'Djerba', 'Tabarka', 'Aïn Draham', 'Nabeul', 'Bizerte'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export function DestinationsSection({ destinations }: { destinations: { name: string; count: number; image: string | null }[] }) {
  const { t } = useI18n();
  const byName = new Map(destinations.map((d) => [norm(d.name), d]));
  // Real destinations first (with counts from the database), then the curated regions not yet covered.
  const real = destinations.filter((d) => d.count > 0 && !/tunisie/i.test(d.name));
  const items = [
    ...real.map((d) => ({ name: d.name, count: d.count, image: d.image })),
    ...CURATED.filter((c) => !byName.has(norm(c))).map((c) => ({ name: c, count: 0, image: null as string | null })),
  ].slice(0, 8);
  return (
    <section aria-labelledby="dest-title" className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="dest-title" className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)] text-white">{t('home.destinations')}</h2>
          <p className="mt-2 text-neutral-400">{t('home.destinationsLead')}</p>
        </div>
        <Link href="/carte" className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200 sm:inline-flex">{t('footer.map')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((d, i) => (
          <li key={d.name} className={cn(i === 0 && 'col-span-2 row-span-2 lg:col-span-2')}>
            <Link href={`/accommodations?where=${encodeURIComponent(d.name)}`} className="on-dark group relative flex h-full min-h-[11rem] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(120%_90%_at_20%_0%,rgba(251,191,36,0.16),transparent_60%),linear-gradient(160deg,#1a1712,#0d0d0e)] focus-visible:outline-2 focus-visible:outline-amber-400 sm:min-h-[13rem]">
              {d.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden="true" />
              <span className="relative mt-auto p-5">
                <span className={cn('block font-serif text-white', i === 0 ? 'text-4xl' : 'text-2xl')}>{d.name}</span>
                <span className="mt-1 block text-sm text-amber-200/90">{d.count > 0 ? `${d.count} ${d.count > 1 ? t('home.houses') : t('home.house')}` : t('home.soon')}</span>
                <span className="mt-3 block h-px w-0 bg-amber-400 transition-all duration-500 group-hover:w-16" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeaturedSection({ results }: { results: SearchResult[] }) {
  const { t } = useI18n();
  if (!results.length) return null;
  return (
    <section aria-labelledby="feat-title" className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="feat-title" className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)] text-white">{t('home.featured')}</h2>
          <p className="mt-2 text-neutral-400">{t('home.featuredLead')}</p>
        </div>
        <Link href="/accommodations" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200">{t('home.seeAll')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {results.slice(0, 8).map((r) => <li key={r.id}><PropertyCardMini r={r} /></li>)}
      </ul>
    </section>
  );
}

export function Experience360Section({ venue }: { venue: Venue | null }) {
  const { t } = useI18n();
  const url = venue?.immersiveUrl && venue.immersiveUrl.startsWith('https://') ? venue.immersiveUrl : null;
  const benefits = [
    { icon: ShieldCheck, text: t('home.360.b1') },
    { icon: Monitor, text: t('home.360.b2') },
    { icon: Eye, text: t('home.360.b3') },
  ];
  return (
    <section id="experience-360" aria-labelledby="xp-title" className="on-dark relative overflow-hidden border-y border-white/10 bg-[#080808] py-16 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_20%,rgba(251,191,36,0.10),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-[1600px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16 lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">{t('home.360.kicker')}</p>
          <h2 id="xp-title" className="mt-4 font-serif text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.03] text-white">{t('home.360.title')}</h2>
          <p className="mt-5 text-lg leading-relaxed text-neutral-300">{t('home.360.lead')}</p>
          <ul className="mt-8 space-y-4">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3.5 text-neutral-200"><span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-400/40 text-amber-300"><Icon className="size-[18px]" aria-hidden="true" /></span><span className="pt-2">{text}</span></li>
            ))}
          </ul>
          <Link href="/accommodations?tour=1" className="mt-9 inline-flex h-13 items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-7 py-4 font-bold text-black shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:brightness-110">
            <Rotate3d className="size-5" aria-hidden="true" /> {t('home.360.cta')}
          </Link>
        </div>
        <div>
          {url ? (
            <TourViewer url={url} title={`Visite virtuelle 360° — ${venue!.name}`} posterLabel={venue!.isDemo ? 'Maison d’hôtes de démonstration' : venue!.name} posterImage={venue!.coverImage ?? '/demo/hero.jpg'} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/demo/hero.jpg" alt="" className="aspect-video w-full rounded-[1.5rem] object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}

export function BecomeHostSection() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="host-title" className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="on-dark relative overflow-hidden rounded-[2rem] border border-amber-400/25 bg-[linear-gradient(120deg,#17130b,#0d0d0e_55%)] px-6 py-14 sm:px-12 lg:px-16">
        <div className="absolute -end-24 -top-24 size-80 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <h2 id="host-title" className="font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.05] text-white">{t('home.host.title')}</h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-300">{t('home.host.lead')}</p>
          <Link href="/devenir-hote" className="mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-7 py-4 font-bold text-black hover:brightness-110">
            {t('home.host.cta')} <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
