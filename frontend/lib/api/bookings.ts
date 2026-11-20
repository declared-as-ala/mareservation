import { API_BASE } from './base-url';

export type DayStatus = 'available' | 'reserved' | 'pending' | 'blocked' | 'past' | 'unconfigured';

export interface CalendarRoom {
  id: string;
  name: string;
  capacity: number;
  capacityAdults?: number;
  pricePerNight: number;
  minimumNights: number;
}

export interface CalendarDay {
  status: DayStatus;
  availableRooms: number;
  rooms: Record<string, DayStatus>;
}

export interface PublicCalendar {
  venue: { id: string; slug?: string; name: string; timezone: string; isDemo: boolean };
  bookable: boolean;
  reason?: 'DEMO' | 'NOT_CONFIGURED';
  from: string;
  to: string;
  today: string;
  rooms: CalendarRoom[];
  days: Record<string, CalendarDay>;
}

export type Quote =
  | {
      ok: true;
      available: true;
      room: { id: string; name: string };
      checkIn: string;
      checkOut: string;
      nights: number;
      adults: number;
      children: number;
      pricePerNight: number | null;
      total: number | null;
      currency: 'TND';
    }
  | { ok: true; available: false; reason: string; message: string; nights: number };

export interface BookingGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BookingConfirmation {
  reference: string;
  status: string;
  replay: boolean;
  accessToken?: string;
  expiresAt?: string;
  summary: {
    venueName?: string;
    roomName?: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    total: number | null;
    currency: string;
    customerName: string;
  };
}

export class BookingApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public fields?: Record<string, string[]>) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/bookings${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new BookingApiError(res.status, body.error || 'Une erreur est survenue.', body.code, body.fields);
  return body as T;
}

export const fetchCalendar = (venue: string, from: string, to: string) =>
  call<PublicCalendar>(`/venues/${encodeURIComponent(venue)}/calendar?from=${from}&to=${to}`);

export interface StayParams {
  venueId: string;
  roomId?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

export const fetchQuote = (p: StayParams) => call<Quote>('/quote', { method: 'POST', body: JSON.stringify(p) });

export const createBookingRequest = (p: StayParams & { guest: BookingGuest; specialRequest?: string; website?: string }, idempotencyKey: string) =>
  call<BookingConfirmation>('/requests', { method: 'POST', body: JSON.stringify(p), headers: { 'Idempotency-Key': idempotencyKey } });

export const lookupBooking = (reference: string, token: string) =>
  call<BookingConfirmation & { statusReason?: string; createdAt?: string }>(`/requests/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`);
