import type { VenueType } from '../models/Venue';

export type OwnerServiceDomain =
  | 'HOTEL'
  | 'EVENT'
  | 'COWORKING'
  | 'CAFE_LOUNGE'
  | 'RESTAURANT'
  | 'CINEMA'
  | 'EVENT_SPACE';

export function normalizeServiceDomains(input: unknown): OwnerServiceDomain[] {
  if (!Array.isArray(input)) return [];
  const allowed: OwnerServiceDomain[] = ['HOTEL', 'EVENT', 'COWORKING', 'CAFE_LOUNGE', 'RESTAURANT', 'CINEMA', 'EVENT_SPACE'];
  const set = new Set<OwnerServiceDomain>();
  for (const item of input) {
    const key = String(item || '').trim().toUpperCase() as OwnerServiceDomain;
    if (allowed.includes(key)) set.add(key);
  }
  return [...set];
}

export function venueTypeToDomain(type: VenueType): OwnerServiceDomain {
  switch (type) {
    case 'HOTEL':
      return 'HOTEL';
    case 'RESTAURANT':
      return 'RESTAURANT';
    case 'CAFE':
    case 'CAFE_LOUNGE':
      return 'CAFE_LOUNGE';
    case 'COWORKING':
      return 'COWORKING';
    case 'CINEMA':
      return 'CINEMA';
    case 'EVENT_SPACE':
      return 'EVENT_SPACE';
    default:
      return 'EVENT';
  }
}

export function domainsToVenueTypes(domains: OwnerServiceDomain[]): VenueType[] {
  const out = new Set<VenueType>();
  for (const d of domains) {
    if (d === 'HOTEL') out.add('HOTEL');
    if (d === 'RESTAURANT') out.add('RESTAURANT');
    if (d === 'CAFE_LOUNGE') {
      out.add('CAFE');
      out.add('CAFE_LOUNGE');
    }
    if (d === 'COWORKING') out.add('COWORKING');
    if (d === 'CINEMA') out.add('CINEMA');
    if (d === 'EVENT_SPACE') out.add('EVENT_SPACE');
  }
  return [...out];
}
