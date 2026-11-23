'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Mountain, Palmtree, Sailboat, Sun, Trees, Waves } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const TunisiaMap = dynamic(() => import('@/components/map/TunisiaMap').then((m) => m.TunisiaMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-[1.6rem] bg-[#F3EEE4]" aria-hidden="true" />,
});

/** Destinations: city centres (public geographic facts) + a short factual description of the region. */
const DESTINATIONS = [
  { name: 'Hammamet', region: 'Cap Bon · Nabeul', note: 'Plages, médina et jardins d’orangers', lat: 36.4, lng: 10.61, icon: Waves },
  { name: 'Nabeul', region: 'Cap Bon', note: 'Poterie, marchés et bord de mer', lat: 36.4561, lng: 10.7376, icon: Sun },
  { name: 'Sousse', region: 'Sahel', note: 'Médina classée et longues plages', lat: 35.8256, lng: 10.6084, icon: Sailboat },
  { name: 'Monastir', region: 'Sahel', note: 'Ribat, marina et eaux calmes', lat: 35.7643, lng: 10.8113, icon: Waves },
  { name: 'Djerba', region: 'Médenine', note: 'Île, menzels et palmeraies', lat: 33.875, lng: 10.8575, icon: Palmtree },
  { name: 'Bizerte', region: 'Nord', note: 'Vieux port et côte sauvage', lat: 37.2744, lng: 9.8739, icon: Sailboat },
  { name: 'Tabarka', region: 'Nord-Ouest · Jendouba', note: 'Corail, pins et criques', lat: 36.9544, lng: 8.758, icon: Trees },
  { name: 'Aïn Draham', region: 'Nord-Ouest · Jendouba', note: 'Forêts de chênes-lièges et montagne', lat: 36.7833, lng: 8.6833, icon: Mountain },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export function DestinationsExplorer({ destinations }: { destinations: { name: string; count: number }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const counts = useMemo(() => new Map(destinations.map((d) => [norm(d.name), d.count])), [destinations]);
  const countOf = (name: string) => counts.get(norm(name)) ?? 0;
  const markers = useMemo(
    () => DESTINATIONS.map((d) => ({ id: d.name, lat: d.lat, lng: d.lng, title: d.name, label: countOf(d.name) ? `${d.name} · ${countOf(d.name)}` : d.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counts]
  );
  const href = (name: string) => `/accommodations?where=${encodeURIComponent(name)}`;

  return (
    <section aria-labelledby="dest-title" className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-300">Explorez la Tunisie</p>
          <h2 id="dest-title" className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.8rem)] text-white">{t('home.destinations')}</h2>
          <p className="mt-2 max-w-xl text-neutral-400">{t('home.destinationsLead')}</p>
        </div>
        <Link href="/carte" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200">
          {t('footer.map')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        <div className="relative h-80 overflow-hidden rounded-[1.6rem] border border-white/10 shadow-[0_20px_60px_rgba(23,20,15,0.10)] sm:h-[26rem] lg:order-2 lg:h-auto lg:min-h-[34rem]">
          <TunisiaMap
            className="absolute inset-0"
            markers={markers}
            highlightedId={hover}
            onSelect={(id) => id && router.push(href(id))}
            ariaLabel="Carte des destinations en Tunisie"
          />
        </div>

        <ul className="grid content-start gap-2.5 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
          {DESTINATIONS.map(({ name, region, note, icon: Icon }) => {
            const n = countOf(name);
            return (
              <li key={name}>
                <Link
                  href={href(name)}
                  onMouseEnter={() => setHover(name)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(name)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    'group flex items-center gap-4 rounded-2xl border bg-[#111112] px-4 py-3.5 transition-all focus-visible:outline-2 focus-visible:outline-amber-400',
                    hover === name ? 'border-amber-400/60 shadow-[0_10px_30px_rgba(23,20,15,0.10)]' : 'border-white/10 hover:border-white/25'
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-400/12 text-amber-300 transition-colors group-hover:bg-amber-400 group-hover:text-black">
                    <Icon className="size-6 stroke-[1.5]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-serif text-xl text-white">{name}</span>
                      <span className="truncate text-xs text-neutral-500">{region}</span>
                    </span>
                    <span className="block truncate text-sm text-neutral-400">{note}</span>
                  </span>
                  <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', n ? 'bg-emerald-500/12 text-emerald-300' : 'bg-white/[0.05] text-neutral-500')}>
                    {n ? `${n} ${n > 1 ? t('home.houses') : t('home.house')}` : t('home.soon')}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-amber-300 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
