import { API_BASE } from './base-url';
import { useAuthStore } from '@/stores/auth';

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
  price?: number | null;
}

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export interface PublicCalendar {
  venue: { id: string; slug?: string; name: string; timezone: string; isDemo: boolean };
  bookable: boolean;
  demo: boolean;
  reason?: 'DEMO' | 'NOT_CONFIGURED' | 'BOOKING_DISABLED' | 'NOT_PUBLISHED';
  message?: string;
  bookingMode: 'request' | 'instant';
  rentalMode: 'rooms' | 'entire';
  minimumNights: number;
  maxGuests: number | null;
  cleaningFee: number;
  serviceFee: number;
  cancellationPolicy: CancellationPolicy;
  requestTtlHours: number;
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
      rentalMode: 'rooms' | 'entire';
      room: { id: string; name: string };
      units: { id: string; name: string; capacity: number; subtotal: number }[];
      checkIn: string;
      checkOut: string;
      nights: number;
      adults: number;
      children: number;
      pricePerNight: number | null;
      nightly: { date: string; price: number }[];
      subtotal: number | null;
      cleaningFee: number;
      serviceFee: number;
      total: number | null;
      currency: 'TND';
      demo?: boolean;
      bookingMode?: 'request' | 'instant';
    }
  | { ok: true; available: false; reason: string; message: string; nights: number };

export interface BookingGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BookingSummary {
  venueName?: string;
  venueSlug?: string;
  roomName?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  subtotal?: number | null;
  cleaningFee?: number;
  serviceFee?: number;
  total: number | null;
  currency: string;
  customerName: string;
}

export interface BookingConfirmation {
  reference: string;
  status: string;
  bookingMode?: 'request' | 'instant';
  isDemo?: boolean;
  paymentStatus?: string;
  replay: boolean;
  accessToken?: string;
  expiresAt?: string;
  summary: BookingSummary;
}

export interface BookingLookup extends BookingConfirmation {
  statusReason?: string;
  createdAt?: string;
  cancellable?: boolean;
  cancellationPolicy?: CancellationPolicy;
  cancellationNotes?: string;
  arrivalInstructions?: string;
  history?: { to: string; at: string; reason?: string }[];
}

export class BookingApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public fields?: Record<string, string[]>) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_BASE}/api/v1/bookings${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // Signed-in guests: lets the API attach the booking to their account (Mes réservations).
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
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
  roomIds?: string[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

export const fetchQuote = (p: StayParams) => call<Quote>('/quote', { method: 'POST', body: JSON.stringify(p) });

export const createBookingRequest = (p: StayParams & { guest: BookingGuest; specialRequest?: string; website?: string }, idempotencyKey: string) =>
  call<BookingConfirmation>('/requests', { method: 'POST', body: JSON.stringify(p), headers: { 'Idempotency-Key': idempotencyKey } });

export const lookupBooking = (reference: string, token: string) =>
  call<BookingLookup>(`/requests/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`);

export const cancelBooking = (reference: string, token: string, reason?: string) =>
  call<{ reference: string; status: string }>(`/requests/${encodeURIComponent(reference)}/cancel`, { method: 'POST', body: JSON.stringify({ token, reason }) });

/* ── discovery search ─────────────────────────────────────── */
export const FEATURES: { key: string; label: string }[] = [
  { key: 'pool', label: 'Piscine' },
  { key: 'parking', label: 'Parking' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'air_conditioning', label: 'Climatisation' },
  { key: 'garden', label: 'Jardin' },
  { key: 'sea_view', label: 'Vue mer' },
  { key: 'mountain_view', label: 'Vue montagne' },
  { key: 'breakfast', label: 'Petit-déjeuner' },
  { key: 'pets_allowed', label: 'Animaux acceptés' },
  { key: 'beachfront', label: 'Bord de mer' },
  { key: 'traditional', label: 'Traditionnel' },
  { key: 'luxury', label: 'Luxe' },
  { key: 'family_friendly', label: 'En famille' },
  { key: 'romantic', label: 'Romantique' },
];
export const featureLabel = (k: string) => FEATURES.find((f) => f.key === k)?.label ?? k;

export const GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan', 'Kasserine', 'Kébili',
  'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse',
  'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  city: string;
  governorate: string | null;
  coverImage: string | null;
  coordinates: { lat: number; lng: number } | null;
  features: string[];
  fromPrice: number | null;
  maxGuests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  instantBooking: boolean;
  bookable: boolean;
  isDemo: boolean;
  hasVirtualTour: boolean;
  rating: number | null;
  ratingCount: number;
  availability?: { available: boolean; total: number | null; nights: number };
}

export interface SearchResponse {
  total: number;
  results: SearchResult[];
}

export const searchGuesthouses = (params: URLSearchParams) => call<SearchResponse>(`/search?${params.toString()}`);

export const CANCELLATION_LABEL: Record<CancellationPolicy, { title: string; text: string }> = {
  flexible: { title: 'Flexible', text: 'Annulation gratuite jusqu’à 24 h avant l’arrivée.' },
  moderate: { title: 'Modérée', text: 'Annulation gratuite jusqu’à 5 jours avant l’arrivée.' },
  strict: { title: 'Stricte', text: 'Annulation gratuite jusqu’à 14 jours avant l’arrivée.' },
};
