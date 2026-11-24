'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import { getVenueHref } from '@/lib/venueHref';
import { AppContainer } from '@/components/shared/AppContainer';
import { TourViewer } from '@/components/exploria/TourViewer';
import { Reveal } from './Reveal';

/** Fallback if the API is unreachable (the tour is authorised for public showcase). */
const DEFAULT_TOUR_URL = process.env.NEXT_PUBLIC_FEATURED_TOUR_URL || 'https://spinview360.com/villaaa/';

const DEFAULT_COVER = '/demo/maison-demo-cover.jpg';

const DEMO_NOTICE =
  "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.";

/**
 * Featured demonstration maison d'hôtes + immersive 360° player.
 * The player is only loaded after a click, so it never weighs on first load.
 */
export function HomeDemoShowcase() {
  const { data } = useQuery({
    queryKey: ['public-recommended-venues'],
    queryFn: () => fetchVenues({ isFeatured: true }),
    staleTime: 5 * 60 * 1000,
  });
  const venue = (data ?? []).find((v) => v.immersiveUrl);
  const tourUrl = venue?.immersiveUrl || DEFAULT_TOUR_URL;
  const href = venue ? getVenueHref(venue) : '/maisons-d-hotes';

  return (
    <section
      id="experience-360"
      aria-labelledby="demo-title"
      className="relative scroll-mt-24 overflow-hidden border-t border-white/[0.06] bg-[#0B0B0C] py-16 text-white sm:py-24"
    >
      <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-amber-500/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-amber-600/[0.04] blur-[120px]" />

      <AppContainer>
        <div className="relative grid items-center gap-10 lg:grid-cols-[0.8fr_1.5fr] lg:gap-14">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
              Maison d&apos;hôtes de démonstration
            </span>
            <h2 id="demo-title" className="mt-5 font-serif text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
              Entrez avant{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                d&apos;avoir réservé.
              </span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
              Parcourez les pièces, les patios et les terrasses à votre rythme, comme si vous y étiez. Faites glisser pour
              regarder à 360° — sur mobile comme sur ordinateur, en plein écran si vous le souhaitez.
            </p>

            <p role="note" className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-5 py-4 text-sm leading-relaxed text-amber-100/90">
              {DEMO_NOTICE}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={href}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#e0a527] hover:bg-[#eab33a] px-6 text-sm font-black text-black transition-all active:scale-[0.98]"
              >
                Voir la fiche
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] px-6 text-sm font-bold text-neutral-200 transition-all hover:border-amber-300/40 hover:bg-amber-300/[0.08] hover:text-amber-200"
              >
                Propriétaire ? Contactez-nous
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <TourViewer
              url={tourUrl}
              title="Visite virtuelle 360° — maison d'hôtes de démonstration Exploria360"
              posterLabel="Maison d'hôtes de démonstration"
              posterImage={venue?.coverImage || DEFAULT_COVER}
            />
          </Reveal>
        </div>
      </AppContainer>
    </section>
  );
}
