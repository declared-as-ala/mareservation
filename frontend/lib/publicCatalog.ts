/**
 * Public catalogue visibility (feature flag) — frontend side.
 *
 * Exploria360 launches with maisons d'hôtes only. Other categories keep their
 * code, data and routes but are not reachable from the public site until their
 * venue type is added to NEXT_PUBLIC_PUBLIC_VENUE_TYPES (comma separated).
 * Mirror of the backend PUBLIC_VENUE_TYPES; the backend remains the authority
 * for data (this file only gates navigation and URLs).
 *
 * Edge-safe: no Node APIs.
 */

const DEFAULT_TYPES = ['MAISON_DHOTE'];

export function getPublicVenueTypes(): string[] {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_VENUE_TYPES;
  const parsed = (raw ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return parsed.length ? parsed : DEFAULT_TYPES;
}

/** Public URL prefixes owned by each venue type (a prefix may be shared). */
const TYPE_PATHS: Record<string, string[]> = {
  MAISON_DHOTE: [],
  HOTEL: ['/hotel', '/hotels'],
  RESTAURANT: ['/restaurant', '/restaurants', '/restauration'],
  CAFE: ['/cafe', '/cafes'],
  CAFE_LOUNGE: ['/cafe', '/cafes'],
  BAR: ['/cafe', '/cafes', '/sorties'],
  ROOFTOP: ['/cafe', '/cafes', '/sorties'],
  BEACH_CLUB: ['/cafe', '/cafes', '/sorties'],
  CLUB: ['/cafe', '/cafes', '/sorties'],
  LOUNGE: ['/cafe', '/cafes', '/sorties'],
  SPA: ['/bien-etre', '/cafe', '/cafes'],
  CINEMA: ['/cinema'],
  EVENT_SPACE: ['/event-space', '/evenement', '/evenements'],
  COWORKING: ['/coworking'],
};

/** Cross-category public pages that only make sense with several categories. */
const ALWAYS_HIDDEN_PATHS = ['/lieu', '/sos-conseil'];

function allPrefixes(): string[] {
  return Array.from(new Set(Object.values(TYPE_PATHS).flat().concat(ALWAYS_HIDDEN_PATHS)));
}

function enabledPrefixes(): Set<string> {
  const enabled = new Set<string>();
  for (const t of getPublicVenueTypes()) (TYPE_PATHS[t] ?? []).forEach((p) => enabled.add(p));
  return enabled;
}

/** True when `pathname` belongs to a category that is currently hidden. */
export function isHiddenCategoryPath(pathname: string): boolean {
  const enabled = enabledPrefixes();
  return allPrefixes().some(
    (p) => !enabled.has(p) && (pathname === p || pathname.startsWith(p + '/'))
  );
}

export function isPublicVenueType(type?: string | null): boolean {
  return !!type && getPublicVenueTypes().includes(type.toUpperCase());
}
