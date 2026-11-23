import Link from 'next/link';
import { Bath, BedDouble, Check, ChevronRight, Clock, Hand, MapPin, Maximize2, ScrollText, ShieldCheck, Smartphone, UserRound, Users } from 'lucide-react';
import type { Venue } from '@/lib/api/types';
import { MobileBookingBar, ShareButton } from './PropertyActions';
import { TourViewer } from './TourViewer';
import { PropertyGallery } from './PropertyGallery';
import { PropertyLocationMap, SimilarGuesthouses } from './PropertyExtras';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { CANCELLATION_LABEL, featureLabel, type CancellationPolicy } from '@/lib/api/bookings';
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
  const photos = [...new Set([venue.coverImage, ...(venue.gallery ?? [])].filter((x): x is string => !!x))];
  if (!photos.length && cover) photos.push(cover);
  const paragraphs = (venue.description ?? '').split(/\n{2,}|(?<=\.)\s{2,}/).filter(Boolean);
  const features = venue.features ?? [];
  const amenities = (venue.amenities ?? []).filter((a) => !features.some((f) => featureLabel(f).toLowerCase() === a.toLowerCase()));
  const venueKey = venue.slug || venue._id;
  const location = [venue.city, venue.governorate && venue.governorate !== venue.city ? venue.governorate : null].filter(Boolean).join(', ');
  const coords = venue.coordinates?.lat != null && venue.coordinates?.lng != null ? { lat: venue.coordinates.lat, lng: venue.coordinates.lng } : null;
  const fromPrice = venue.rentalMode === 'entire' ? (venue.entirePricePerNight ?? null) : null;
  const policy = CANCELLATION_LABEL[(venue.cancellationPolicy as CancellationPolicy) ?? 'moderate'] ?? CANCELLATION_LABEL.moderate;

  const specs = [
    venue.maxGuests ? { icon: Users, label: `${venue.maxGuests} voyageurs` } : null,
    venue.bedrooms != null ? { icon: BedDouble, label: `${venue.bedrooms} chambre${venue.bedrooms > 1 ? 's' : ''}` } : null,
    venue.beds != null ? { icon: BedDouble, label: `${venue.beds} lit${venue.beds > 1 ? 's' : ''}` } : null,
    venue.bathrooms != null ? { icon: Bath, label: `${venue.bathrooms} salle${venue.bathrooms > 1 ? 's' : ''} de bain` } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

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
    <article className="bg-[#0B0B0C] text-white">
      {isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(demoLd) }} />}
      {isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd(breadcrumbs)) }} />}

      {/* Title block */}
      <header className="mx-auto max-w-7xl px-4 pb-5 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <nav aria-label="Fil d’Ariane" className="mb-4 text-xs text-white/60">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-white">Accueil</Link></li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li><Link href="/accommodations" className="hover:text-white">Maisons d’hôtes</Link></li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li aria-current="page" className="text-white/90">{venue.name}</li>
          </ol>
        </nav>
        <div className="mb-4 flex flex-wrap gap-2">
          {isDemo && <span className="rounded-full bg-amber-400 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black">Démonstration</span>}
          {tourUrl && <span className="rounded-full border border-white/25 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/80">Visite 360°</span>}
          {venue.bookingMode === 'instant' && <span className="rounded-full border border-amber-400/40 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-200">Réservation instantanée</span>}
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="max-w-4xl font-serif text-[clamp(1.9rem,4.6vw,3.6rem)] font-medium leading-[1.05]">{venue.name}</h1>
          <ShareButton title={venue.name} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
          {!isDemo && location && <span className="flex items-center gap-1.5"><MapPin className="size-4 text-amber-400" aria-hidden="true" /> {location}</span>}
          {specs.map(({ icon: Icon, label }) => <span key={label} className="flex items-center gap-1.5"><Icon className="size-4 text-amber-400" aria-hidden="true" /> {label}</span>)}
        </div>
      </header>

      {/* 1. Virtual tour first — the Exploria360 experience */}
      {tourUrl && (
        <section id="visite" aria-labelledby="visite-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-10">
          <h2 id="visite-title" className="sr-only">Visite virtuelle 360°</h2>
          <div className="overflow-hidden rounded-[1.6rem] shadow-[0_24px_70px_rgba(23,20,15,0.16)]">
            <TourViewer url={tourUrl} title={`Visite virtuelle 360° — ${venue.name}`} posterLabel={isDemo ? 'Maison d’hôtes de démonstration' : venue.name} posterImage={cover} />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-400" aria-label="Comment visiter">
            {HOW_TO.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-2"><Icon className="size-4 text-amber-400" aria-hidden="true" />{title}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. Photo album */}
      {photos.length > 0 && (
        <section aria-labelledby="album-title" className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="album-title" className="font-serif text-3xl font-medium">Album photos</h2>
            <span className="text-sm text-neutral-500">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
          </div>
          <PropertyGallery images={photos} name={venue.name} />
        </section>
      )}

      {/* Two columns: content + sticky reservation card */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-14 lg:px-10">
        <div className="min-w-0 space-y-14">
          <section aria-labelledby="about-title">
            <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-amber-400">{isDemo ? 'L’expérience immersive' : 'À propos'}</p>
            <h2 id="about-title" className="font-serif text-3xl font-medium">{isDemo ? 'Visiter avant de réserver.' : 'La maison'}</h2>
            <div className="mt-5 space-y-4 text-[1.02rem] leading-relaxed text-neutral-400">
              {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{venue.description}</p>}
            </div>
          </section>

          {(features.length > 0 || amenities.length > 0) && (
            <section aria-labelledby="amen-title">
              <h2 id="amen-title" className="font-serif text-3xl font-medium">Équipements et services</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {[...features.map(featureLabel), ...amenities].map((a) => (
                  <li key={a} className="flex items-center gap-2.5 text-neutral-300"><Check className="size-4 shrink-0 text-amber-400" aria-hidden="true" /> {a}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="rules-title" className="grid gap-5 sm:grid-cols-2">
            <h2 id="rules-title" className="sr-only">Informations pratiques</h2>
            <div className="rounded-[1.4rem] border border-white/10 bg-[#111112] p-6">
              <h3 className="flex items-center gap-2 font-serif text-xl"><Clock className="size-5 text-amber-400" aria-hidden="true" /> Arrivée et départ</h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Arrivée</dt><dd className="text-right">{venue.checkInPolicy || 'À convenir avec l’hôte'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Départ</dt><dd className="text-right">{venue.checkOutPolicy || 'À convenir avec l’hôte'}</dd></div>
                {(venue.minimumNights ?? 1) > 1 && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Séjour minimum</dt><dd>{venue.minimumNights} nuits</dd></div>}
              </dl>
              {venue.arrivalInstructions && <p className="mt-4 text-sm leading-relaxed text-neutral-400">Les instructions d’arrivée détaillées vous sont communiquées après confirmation.</p>}
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-[#111112] p-6">
              <h3 className="flex items-center gap-2 font-serif text-xl"><ShieldCheck className="size-5 text-amber-400" aria-hidden="true" /> Annulation · {policy.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">{policy.text}</p>
              {venue.cancellationNotes && <p className="mt-2 text-sm leading-relaxed text-neutral-400">{venue.cancellationNotes}</p>}
              <p className="mt-2 text-xs text-neutral-500">Aucun paiement en ligne : rien n’est prélevé lors de la réservation.</p>
            </div>
            {(venue.houseRules?.length ?? 0) > 0 && (
              <div className="rounded-[1.4rem] border border-white/10 bg-[#111112] p-6 sm:col-span-2">
                <h3 className="flex items-center gap-2 font-serif text-xl"><ScrollText className="size-5 text-amber-400" aria-hidden="true" /> Règlement intérieur</h3>
                <ul className="mt-4 grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                  {venue.houseRules!.map((r) => <li key={r} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />{r}</li>)}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="where-title">
            <h2 id="where-title" className="font-serif text-3xl font-medium">Localisation</h2>
            {coords ? (
              <>
                <p className="mb-4 mt-2 text-sm text-neutral-400">{location}{!isDemo && venue.address ? ` — ${venue.address}` : ''}</p>
                <PropertyLocationMap lat={coords.lat} lng={coords.lng} name={venue.name} />
              </>
            ) : (
              <p className="mt-3 text-sm text-neutral-400">{isDemo ? 'Fiche de démonstration : aucune adresse n’est communiquée.' : `${location || 'Tunisie'} — la position exacte est communiquée par l’hôte après confirmation.`}</p>
            )}
          </section>

          {(venue.hostDisplayName || venue.hostBio) && (
            <section aria-labelledby="host-title" className="rounded-[1.4rem] border border-white/10 bg-[#111112] p-6">
              <h2 id="host-title" className="flex items-center gap-2 font-serif text-2xl"><UserRound className="size-5 text-amber-400" aria-hidden="true" /> Votre hôte{venue.hostDisplayName ? ` : ${venue.hostDisplayName}` : ''}</h2>
              {venue.hostBio && <p className="mt-3 text-sm leading-relaxed text-neutral-400">{venue.hostBio}</p>}
            </section>
          )}

        </div>

        <aside className="hidden lg:block" aria-label="Réservation">
          <div className="sticky top-24">
            <BookingWidget venueKey={venueKey} venueName={venue.name} tourAnchor="#visite" compact />
          </div>
        </aside>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <SimilarGuesthouses currentId={venue._id} governorate={venue.governorate} />
      </div>

      {isDemo && (
        <section aria-labelledby="owners-title" className="border-t border-white/10 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 id="owners-title" className="font-serif text-[clamp(2rem,4.6vw,3.4rem)] font-medium leading-[1.05]">Vous êtes propriétaire d’une maison d’hôtes en Tunisie ?</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75">Faites visiter la vôtre en 360° et laissez vos futurs hôtes la découvrir — puis réserver — en ligne.</p>
            <Link href="/contact" className="mt-8 inline-flex h-14 items-center rounded-full bg-amber-400 px-9 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300">Parlons de votre maison</Link>
          </div>
        </section>
      )}

      <MobileBookingBar venueKey={venueKey} venueName={venue.name} fromPrice={fromPrice} demo={isDemo} />
    </article>
  );
}
