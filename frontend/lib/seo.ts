import type { Venue } from '@/lib/api/types';
import { SITE_URL } from '@/lib/serverApi';

/** Serialises JSON-LD safely for an inline <script> (prevents </script> breakouts). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

/**
 * Structured data for a REAL maison d'hôtes, built only from fields that exist in the
 * database. Deliberately no aggregateRating/review/price/openingHours: nothing is inferred.
 */
export function lodgingJsonLd(venue: Venue, path: string) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: venue.name,
    url: `${SITE_URL}${path}`,
  };
  const image = venue.coverImage || venue.gallery?.[0];
  if (image) data.image = image;
  if (venue.shortDescription) data.description = venue.shortDescription;
  if (venue.city) {
    data.address = {
      '@type': 'PostalAddress',
      addressLocality: venue.city,
      ...(venue.address ? { streetAddress: venue.address } : {}),
      addressCountry: 'TN',
    };
  }
  if (venue.phone) data.telephone = venue.phone;
  const lat = venue.coordinates?.lat;
  const lng = venue.coordinates?.lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    data.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
  }
  return data;
}
