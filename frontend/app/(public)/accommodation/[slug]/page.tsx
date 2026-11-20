import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PropertyPage } from '@/components/exploria/PropertyPage';
import { getVenueServer, SITE_URL } from '@/lib/serverApi';
import { breadcrumbJsonLd, jsonLd, lodgingJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueServer(slug);
  if (!venue) return { title: 'Maison d’hôtes introuvable', robots: { index: false, follow: false } };

  const path = `/accommodation/${slug}`;
  if (venue.isDemo) {
    // A demonstration listing must not be presented to search engines as a genuine, bookable guesthouse.
    return {
      title: `${venue.name} — visite 360° de démonstration`,
      description:
        'Fiche de démonstration Exploria360 : découvrez en 360° comment une maison d’hôtes tunisienne peut se faire visiter avant de réserver. Réservations non ouvertes.',
      alternates: { canonical: path },
      robots: { index: false, follow: true },
      openGraph: { title: `${venue.name} — démonstration`, url: `${SITE_URL}${path}`, type: 'website' },
    };
  }

  return {
    title: `${venue.name}${venue.city ? ` — maison d’hôtes à ${venue.city}` : ''}`,
    description:
      venue.shortDescription ||
      `Découvrez ${venue.name} en visite virtuelle 360° et réservez votre séjour sur Exploria360.`,
    alternates: { canonical: path },
    openGraph: {
      title: venue.name,
      url: `${SITE_URL}${path}`,
      type: 'website',
      ...(venue.coverImage ? { images: [venue.coverImage] } : {}),
    },
  };
}

export default async function AccommodationPage({ params }: Props) {
  const { slug } = await params;
  const venue = await getVenueServer(slug);
  if (!venue) notFound();

  const path = `/accommodation/${slug}`;
  if (venue.isDemo) return <PropertyPage venue={venue} path={path} />;

  // Real maisons: structured data from verified fields only + the shared page with the booking widget.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(lodgingJsonLd(venue, path)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbJsonLd([
              { name: 'Accueil', path: '/' },
              { name: 'Maisons d’hôtes', path: '/accommodations' },
              { name: venue.name, path },
            ])
          ),
        }}
      />
      <PropertyPage venue={venue} path={path} />
    </>
  );
}
