import { apiGetRaw } from './client';
import type { Venue } from './types';
import type { Event } from './types';

export interface SearchResult {
  venues?: Venue[];
  events?: Event[];
}

function normalizeVenue(venue: Venue & { venueType?: Venue['type'] }): Venue {
  return {
    ...venue,
    // Compatibility while older search API responses are still deployed.
    type: venue.venueType ?? venue.type,
  };
}

export async function globalSearch(q: string): Promise<SearchResult> {
  if (!q?.trim()) return { venues: [], events: [] };
  try {
    const data = await apiGetRaw<SearchResult>(`/search/global?q=${encodeURIComponent(q.trim())}`);
    return {
      venues: Array.isArray(data?.venues) ? data.venues.map(normalizeVenue) : [],
      events: Array.isArray(data?.events) ? data.events : [],
    };
  } catch {
    return { venues: [], events: [] };
  }
}
