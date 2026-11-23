import type { Venue } from '@/lib/api/types';

/** Server-side (RSC / route handlers) API access — the browser uses relative /api/v1 URLs instead. */
export function serverApiBase(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.NODE_ENV === 'production' ? 'http://backend:3001' : 'http://localhost:3001')
  );
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.exploria360.com').replace(/\/$/, '');

async function getJson<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${serverApiBase()}/api/v1${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // API unreachable (e.g. at build time) — callers degrade gracefully
  }
}

export async function getVenueServer(idOrSlug: string): Promise<Venue | null> {
  const data = await getJson<Venue>(`/venues/${encodeURIComponent(idOrSlug)}`);
  return data && typeof data === 'object' && '_id' in data ? data : null;
}

export async function getPublicVenuesServer(): Promise<Venue[]> {
  const data = await getJson<Venue[]>('/venues?type=MAISON_DHOTE', 300);
  return Array.isArray(data) ? data : [];
}

export interface HomeData {
  results: import('@/lib/api/bookings').SearchResult[];
  destinations: { name: string; kind: 'city' | 'governorate'; governorate: string | null; count: number; image: string | null }[];
  tourVenue: Venue | null;
}

/** Everything the home page needs, fetched server-side (fast first paint, SEO). Degrades to empty data. */
export async function getHomeDataServer(): Promise<HomeData> {
  const [search, dest] = await Promise.all([
    getJson<{ results: HomeData['results'] }>('/bookings/search', 60),
    getJson<{ destinations: HomeData['destinations'] }>('/bookings/destinations', 60),
  ]);
  const results = search?.results ?? [];
  const withTour = results.find((r) => r.hasVirtualTour && !r.isDemo) ?? results.find((r) => r.hasVirtualTour);
  const tourVenue = withTour ? await getVenueServer(withTour.slug) : null;
  return { results, destinations: dest?.destinations ?? [], tourVenue };
}
