import { apiGetRaw } from './client';
import type { Event, EventSession } from './types';

export interface EventsQuery {
  city?: string;
  type?: string;
  venueId?: string;
  upcoming?: boolean;
}

export async function fetchEvents(query: EventsQuery = {}): Promise<Event[]> {
  const params = new URLSearchParams();
  if (query.city) params.set('city', query.city);
  if (query.type) params.set('type', query.type);
  if (query.venueId) params.set('venueId', query.venueId);
  if (query.upcoming !== false) params.set('upcoming', 'true');
  const qs = params.toString();
  const data = await apiGetRaw<Event[]>(`/events${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchEventByIdOrSlug(idOrSlug: string): Promise<Event | null> {
  try {
    const data = await apiGetRaw<Event>(`/events/${encodeURIComponent(idOrSlug)}`);
    return data && typeof data === 'object' && '_id' in data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchEventSessions(eventId: string): Promise<EventSession[]> {
  try {
    const data = await apiGetRaw<EventSession[]>(`/events/${eventId}/sessions`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
