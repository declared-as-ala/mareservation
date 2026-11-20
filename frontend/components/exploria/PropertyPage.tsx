import Link from 'next/link';
import { Check, ChevronRight, Hand, MapPin, Maximize2, Smartphone } from 'lucide-react';
import type { Venue } from '@/lib/api/types';
import { StickyTourCta } from './StickyTourCta';
import { TourViewer } from './TourViewer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { breadcrumbJsonLd, jsonLd } from '@/lib/seo';
import { SITE_URL } from '@/lib/serverApi';

const DEMO_COVER = '/demo/maison-demo-cover.jpg';

function safeHttps(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const HOW_TO = [
  { icon: Hand, title: 'Faites glisser', text: 'Déplacez la souris ou le doigt pour regarder autour de vous.' },
  { icon: Smartphone, title: 'Sur mobile', text: 'Inclinez votre téléphone ou faites glisser, pincez pour zoomer.' },
  { icon: Maximize2, title: 'Plein écran', text: 'Passez en plein écran pour une immersion totale.' },
] as const;

/** Property page shared by the demonstration listing and real, bookable maisons d'hôtes. */
export function PropertyPage({ venue, path }: { venue: Venue; path: string }) {
  const isDemo = !!venue.isDemo;
  const tourUrl = safeHttps(venue.immersiveUrl) ?? (isDemo ? 'https://spinview360.com/villaaa/' : null);
  const cover = venue.coverImage || venue.gallery?.[0] || (isDemo ? DEMO_COVER : null);
  const paragraphs = (venue.description ?? '').split(/\n{2,}|(?<=\.)\s{2,}/).filter(Boolean);
  const amenities = venue.amenities ?? [];
  const venueKey = venue.slug || venue._id;
  const location = [venue.city, venue.governorate && venue.governorate !== venue.city ? venue.governorate : null].filter(Boolean).join(', ');

  const breadcrumbs = [
    { name: 'Accueil', path: '/' },
    { name: 'Maisons d’hôtes', path: '/accommodations' },
    { name: venue.name, path },
  ];
  const demoLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${venue.name} — visite 360° de démonstration`,
    url: `${SITE_URL}${path}`,
    inLanguage: 'fr',
    isPartOf: { '@type': 'WebSite', name: 'Exploria360', url: SITE_URL },
  };

  return (
    <article>
      {isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(demoLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd(breadcrumbs)) }} />

      {/* Hero */}
      <header className="relative overflow-hidden bg-[#0B0B0C] pb-14 pt-10 text-white sm:pb-20 sm:pt-14">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-35" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0C]/60 via-[#0B0B0C]/70 to-[#0B0B0C]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(251,191,36,0.10),transparent)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <nav aria-label="Fil d’Ariane" className="mb-8 text-xs text-white/60">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="hover:text-white">Accueil</Link></li>
              <ChevronRight className="size-3" aria-hidden="true" />
              <li><Link href="/accommodations" className="hover:text-white">Maisons d’hôtes</Link></li>
              <ChevronRight className="size-3" aria-hidden="true" />
              <li aria-current="page" className="text-white/90">{isDemo ? 'Maison de démonstration' : venue.name}</li>
            </ol>
          </nav>

          <div className="mb-5 flex flex-wrap gap-2">
            {isDemo && <span className="rounded-full bg-amber-400 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black">Démonstration</span>}
            {tourUrl && <span className="rounded-full border border-white/25 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/80">Visite 360°</span>}
          </div>

          <h1 className="max-w-4xl font-serif text-[clamp(2.4rem,6.4vw,5rem)] font-medium leading-[1]">{venue.name}</h1>
          {!isDemo && location && (
            <p className="mt-4 flex items-center gap-2 text-white/70"><MapPin className="size-4 text-amber-400" aria-hidden="true" /> {location}</p>
          )}
          {venue.shortDescription && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">{venue.shortDescription}</p>}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {tourUrl && (
              <a href="#visite" className="inline-flex h-14 items-center justify-center rounded-full bg-amber-400 px-8 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Découvrir la visite 360°
              </a>
            )}
            <a href="#reserver" className={cn2(!tourUrl, 'inline-flex h-14 items-center justify-center rounded-full px-8 text-[0.8rem] font-semibold uppercase tracking-[0.16em] transition-colors')}>
              {isDemo ? 'Voir le calendrier' : 'Réserver cette maison'}
            </a>
          </div>
        </div>
      </header>

      {/* 360° tour */}
      {tourUrl && (
        <section id="visite" aria-labelledby="visite-title" className="scroll-mt-20 bg-[#111112] py-14 text-white sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
            <h2 id="visite-title" className="sr-only">Visite virtuelle 360°</h2>
            <TourViewer
              url={tourUrl}
              title={`Visite virtuelle 360° — ${venue.name}`}
              posterLabel={isDemo ? 'Maison d’hôtes de démonstration' : venue.name}
              posterImage={cover}
            />
          </div>
        </section>
      )}

      {/* Booking */}
      <section id="reserver" aria-label="Réservation" className="scroll-mt-20 bg-[#0B0B0C] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
          <BookingWidget venueKey={venueKey} venueName={venue.name} tourAnchor="#visite" />
        </div>
      </section>

      {/* Story / details */}
      <section className="bg-[#0B0B0C] pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:gap-16 lg:px-10">
          <div>
            <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-amber-400">{isDemo ? 'L’expérience immersive' : 'À propos de la maison'}</p>
            <h2 className="font-serif text-[clamp(2rem,4.4vw,3.2rem)] font-medium leading-[1.05] text-white">
              {isDemo ? 'Visiter avant de réserver.' : venue.name}
            </h2>
            <div className="mt-6 space-y-5 text-[1.02rem] leading-relaxed text-neutral-400">
              {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{venue.description}</p>}
            </div>

            {amenities.length > 0 && !isDemo && (
              <div className="mt-10">
                <h3 className="font-serif text-2xl font-medium text-white">Équipements</h3>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 text-neutral-300"><Check className="size-4 shrink-0 text-amber-400" aria-hidden="true" /> {a}</li>
                  ))}
                </ul>
              </div>
            )}

            {tourUrl && (
              <ul className="mt-12 grid gap-6 sm:grid-cols-3">
                {HOW_TO.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="rounded-2xl border border-white/10 bg-[#111112] p-5">
                    <Icon className="size-5 text-amber-400" aria-hidden="true" />
                    <h3 className="mt-3 font-serif text-xl font-medium text-white">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="space-y-4 lg:pt-14" aria-label="Informations pratiques">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-6 text-sm">
              <h3 className="font-serif text-xl font-medium text-white">Informations pratiques</h3>
              <dl className="mt-4 space-y-3">
                {isDemo ? (
                  [['Adresse', 'Non communiquée'], ['Chambres', 'Non renseignées'], ['Tarifs', 'Non renseignés']].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4"><dt className="text-neutral-500">{k}</dt><dd className="text-right text-white/90">{v}</dd></div>
                  ))
                ) : (
                  <>
                    {venue.address && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Adresse</dt><dd className="text-right text-white/90">{venue.address}{venue.city ? `, ${venue.city}` : ''}</dd></div>}
                    {venue.checkInPolicy && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Arrivée</dt><dd className="text-right text-white/90">{venue.checkInPolicy}</dd></div>}
                    {venue.checkOutPolicy && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Départ</dt><dd className="text-right text-white/90">{venue.checkOutPolicy}</dd></div>}
                    {venue.cancellationPolicy && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Annulation</dt><dd className="text-right text-white/90">{venue.cancellationPolicy}</dd></div>}
                  </>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* Prospecting band (demo only) */}
      {isDemo && (
        <section aria-labelledby="owners-title" className="relative overflow-hidden bg-[#0B0B0C] py-16 text-white sm:py-24">
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 id="owners-title" className="font-serif text-[clamp(2rem,4.6vw,3.4rem)] font-medium leading-[1.05]">Vous êtes propriétaire d’une maison d’hôtes en Tunisie ?</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75">Faites visiter la vôtre en 360° et laissez vos futurs hôtes la découvrir — puis réserver — en ligne.</p>
            <Link href="/contact" className="mt-8 inline-flex h-14 items-center rounded-full bg-amber-400 px-9 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300">Parlons de votre maison</Link>
          </div>
        </section>
      )}

      <StickyTourCta targetId={isDemo || !tourUrl ? 'reserver' : 'reserver'} label={isDemo ? 'Voir le calendrier' : 'Réserver cette maison'} />
    </article>
  );
}

/** Secondary/primary style for the second hero CTA depending on whether a tour button precedes it. */
function cn2(primary: boolean, base: string) {
  return primary
    ? `${base} bg-amber-400 text-black hover:bg-amber-300`
    : `${base} border border-white/35 text-white hover:border-amber-400 hover:text-amber-400`;
}
