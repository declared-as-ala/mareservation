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
