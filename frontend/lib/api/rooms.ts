import { apiGetRaw } from './client';
import type { HotelRoom } from './types';
import type { VirtualScene, VirtualHotspot } from './venues';

export interface RoomsQuery {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomType?: string;
}

export async function fetchVenueRooms(
  venueId: string,
  params?: RoomsQuery
): Promise<HotelRoom[]> {
  try {
    const sp = new URLSearchParams();
    if (params?.checkIn) sp.set('startAt', params.checkIn);
    if (params?.checkOut) sp.set('endAt', params.checkOut);
    if (params?.guests) sp.set('guests', String(params.guests));
    if (params?.roomType) sp.set('roomType', params.roomType);
    const qs = sp.toString();
    const data = await apiGetRaw<HotelRoom[] | { data?: HotelRoom[] }>(
      `/venues/${encodeURIComponent(venueId)}/rooms${qs ? `?${qs}` : ''}`
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: HotelRoom[] }).data)) {
      return (data as { data: HotelRoom[] }).data;
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchRoomById(roomId: string): Promise<HotelRoom | null> {
  try {
    const data = await apiGetRaw<HotelRoom | { data?: HotelRoom }>(
      `/rooms/${encodeURIComponent(roomId)}`
    );
    if (data && typeof data === 'object' && '_id' in data) return data as HotelRoom;
    if (data && typeof data === 'object' && 'data' in data) {
      const inner = (data as { data?: HotelRoom }).data;
      if (inner && typeof inner === 'object' && '_id' in inner) return inner;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRoomScenes(
  venueId: string,
  roomId: string
): Promise<{ scenes: VirtualScene[]; hotspots: VirtualHotspot[] }> {
  try {
    const data = await apiGetRaw<{ scenes?: VirtualScene[]; hotspots?: VirtualHotspot[] }>(
      `/venues/${encodeURIComponent(venueId)}/rooms/${encodeURIComponent(roomId)}/scenes`
    );
    return {
      scenes: data?.scenes ?? [],
      hotspots: data?.hotspots ?? [],
    };
  } catch {
    return { scenes: [], hotspots: [] };
  }
}

export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<{ available: boolean; conflictingDates?: string[] }> {
  try {
    const sp = new URLSearchParams({ startAt: checkIn, endAt: checkOut });
    const data = await apiGetRaw<{ available?: boolean; conflictingDates?: string[] }>(
      `/rooms/${encodeURIComponent(roomId)}/availability?${sp}`
    );
    return { available: data?.available ?? true, conflictingDates: data?.conflictingDates };
  } catch {
    return { available: true };
  }
}

// Human-readable room type labels (French)
export const ROOM_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Chambre Standard',
  SUPERIOR: 'Chambre Supérieure',
  DELUXE: 'Chambre Deluxe',
  SUITE: 'Suite',
  JUNIOR_SUITE: 'Junior Suite',
  PRESIDENTIAL_SUITE: 'Suite Présidentielle',
  VILLA: 'Villa',
  APARTMENT: 'Appartement',
  PENTHOUSE: 'Penthouse',
  BUNGALOW: 'Bungalow',
};

// Well-known hotel amenity icons map (lucide icon names)
export const AMENITY_ICONS: Record<string, string> = {
  wifi: 'Wifi',
  pool: 'Waves',
  parking: 'ParkingSquare',
  spa: 'Sparkles',
  restaurant: 'UtensilsCrossed',
  bar: 'Wine',
  gym: 'Dumbbell',
  'air-conditioning': 'Wind',
  concierge: 'BellConcierge',
  'room-service': 'ConciergeBell',
  beach: 'Sunset',
  terrace: 'Mountain',
  balcony: 'Trees',
  jacuzzi: 'Droplets',
  minibar: 'Wine',
  'safe-box': 'Lock',
  tv: 'Tv',
  hairdryer: 'Wind',
  bathtub: 'Bath',
};

export function getRoomNights(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Format a Date as a `YYYY-MM-DD` string using LOCAL calendar parts.
 * Never use `toISOString()` for `<input type="date">`: it converts to UTC,
 * which shifts the day back by one in positive-offset timezones (e.g. UTC+1).
 */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a `YYYY-MM-DD` value from a date input into a LOCAL midnight Date. */
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatNightPrice(price: number): string {
  return `${price.toLocaleString('fr-TN')} DT`;
}
