import type { MetadataRoute } from 'next';
import { getPublicVenuesServer, SITE_URL } from '@/lib/serverApi';
import { getVenueHref } from '@/lib/venueHref';

// Regenerated at most hourly; never fails the build if the API is unreachable.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/accommodations', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/a-propos', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/comment-ca-marche', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const venues = await getPublicVenuesServer();
  // Demonstration listings are NOT submitted to search engines: they are not real, bookable properties.
  const real = venues.filter((v) => !v.isDemo);

  return [
    ...STATIC_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...real.map((v) => ({
      url: `${SITE_URL}${getVenueHref(v)}`,
      lastModified: (v as { updatedAt?: string }).updatedAt ? new Date((v as { updatedAt?: string }).updatedAt!) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
