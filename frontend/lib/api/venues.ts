import { apiGetRaw, apiPostRaw, api } from './client';
import type { Venue, TablePlacement } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mareservtaion-backend.vercel.app';

export interface VenuesQuery {
  type?: string;
  city?: string;
  governorate?: string;
  categoryId?: string;
  hasEvent?: boolean;
  hasVirtualTour?: boolean;
  isFeatured?: boolean;
  isVedette?: boolean;
  priceMin?: number;
  priceMax?: number;
  q?: string;
}

export async function fetchVenues(query: VenuesQuery = {}): Promise<Venue[]> {
  const params = new URLSearchParams();
  if (query.type) params.set('type', query.type);
  if (query.city) params.set('city', query.city);
  if (query.governorate) params.set('governorate', query.governorate);
  if (query.isFeatured === true) params.set('isFeatured', 'true');
  if (query.isVedette === true) params.set('isVedette', 'true');
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.hasEvent === true) params.set('hasEvent', 'true');
  if (query.hasVirtualTour === true) params.set('hasVirtualTour', 'true');
  if (query.priceMin != null) params.set('priceMin', String(query.priceMin));
  if (query.priceMax != null) params.set('priceMax', String(query.priceMax));
  if (query.q?.trim()) params.set('q', query.q.trim());
  const qs = params.toString();
  const data = await apiGetRaw<Venue[]>(`/venues${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchVenueByIdOrSlug(idOrSlug: string): Promise<Venue | null> {
  try {
    const data = await apiGetRaw<Venue>(`/venues/${encodeURIComponent(idOrSlug)}`);
    return data && typeof data === 'object' && '_id' in data ? data : null;
  } catch {
    return null;
  }
}

export interface PublicTablePlacement extends TablePlacement {
  table: {
    _id: string;
    tableNumber: number;
    name?: string;
    capacity: number;
    price: number;
    minimumSpend?: number;
    defaultStatus: 'available' | 'reserved' | 'blocked';
    isVip: boolean;
    locationLabel?: string;
    status: 'available' | 'reserved' | 'blocked';
  };
}

export async function fetchVenueTablePlacements(
  idOrSlug: string,
  params?: { startAt?: string; endAt?: string }
): Promise<PublicTablePlacement[]> {
  try {
    const sp = new URLSearchParams();
    if (params?.startAt) sp.set('startAt', params.startAt);
    if (params?.endAt) sp.set('endAt', params.endAt);
    const qs = sp.toString();
    const data = await apiGetRaw<PublicTablePlacement[]>(
      `/venues/${encodeURIComponent(idOrSlug)}/table-placements${qs ? `?${qs}` : ''}`
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function getVenueAvailabilityStreamUrl(idOrSlug: string): string {
  return `${API_BASE}/api/v1/venues/${encodeURIComponent(idOrSlug)}/availability-stream`;
}

export interface PublicReservableUnit {
  _id: string;
  venueId: string;
  unitType: 'table' | 'room' | 'seat_zone' | 'seat' | 'coworking_desk' | 'coworking_office' | 'coworking_meeting_room';
  label: string;
  code: string;
  capacityMin?: number;
  capacityMax?: number;
  priceType?: 'fixed' | 'perPerson' | 'perNight' | 'perSession' | 'free';
  basePrice: number;
  currency?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'hidden';
  isReservable: boolean;
}

export interface PublicCoworkingAddon {
  _id: string;
  venueId: string;
  key: string;
  name: string;
  unitPrice: number;
  isActive: boolean;
  maxQty?: number;
}

export async function fetchVenueReservableUnits(idOrSlug: string): Promise<PublicReservableUnit[]> {
  const raw = await apiGetRaw<PublicReservableUnit[] | { success?: boolean; data?: PublicReservableUnit[] }>(
    `/venues/${encodeURIComponent(idOrSlug)}/reservable-units`
  );
  return Array.isArray(raw) ? raw : ((raw as { data?: PublicReservableUnit[] })?.data ?? []);
}

export async function fetchVenueCoworkingAddons(idOrSlug: string): Promise<PublicCoworkingAddon[]> {
  const raw = await apiGetRaw<PublicCoworkingAddon[] | { success?: boolean; data?: PublicCoworkingAddon[] }>(
    `/venues/${encodeURIComponent(idOrSlug)}/coworking-addons`
  );
  return Array.isArray(raw) ? raw : ((raw as { data?: PublicCoworkingAddon[] })?.data ?? []);
}

/** Venue with optional startAt/endAt for table/room/seat availability status (available | reserved). */
export async function fetchVenueWithAvailability(
  idOrSlug: string,
  params?: { startAt?: string; endAt?: string }
): Promise<Venue | null> {
  try {
    const sp = new URLSearchParams();
    if (params?.startAt) sp.set('startAt', params.startAt);
    if (params?.endAt) sp.set('endAt', params.endAt);
    const qs = sp.toString();
    const data = await apiGetRaw<Venue>(`/venues/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`);
    return data && typeof data === 'object' && '_id' in data ? data : null;
  } catch {
    return null;
  }
}

// ── Admin: Table Placement CRUD ──────────────────────────────────────────────

export interface PlacementPayload {
  tableId: string;
  positionType: 'yaw_pitch';
  yaw: number;
  pitch: number;
  sceneId?: string;
}

export async function createAdminTablePlacement(
  venueId: string,
  payload: PlacementPayload
): Promise<TablePlacement | null> {
  try {
    const data = await apiPostRaw<TablePlacement>(
      `/admin/venues/${encodeURIComponent(venueId)}/table-placements`,
      payload
    );
    return (data as unknown as TablePlacement) ?? null;
  } catch {
    return null;
  }
}

export async function deleteAdminTablePlacement(
  venueId: string,
  placementId: string
): Promise<void> {
  await api.delete(
    `/admin/venues/${encodeURIComponent(venueId)}/table-placements/${encodeURIComponent(placementId)}`
  );
}

export async function resetAdminTablePlacements(venueId: string): Promise<void> {
  await api.delete(
    `/admin/venues/${encodeURIComponent(venueId)}/table-placements`
  );
}

// ── Public 360° Virtual Tour ─────────────────────────────────────────────────

export interface VirtualScene {
  _id: string;
  roomId?: string | null;
  name: string;
  description?: string;
  image: string;
  order: number;
}

export interface VirtualHotspot {
  _id: string;
  virtualTourId: string;
  targetId: string;
  label: string;
  xPercent: number;
  yPercent: number;
  yaw?: number;
  pitch?: number;
}

export async function fetchVenueScenes(
  idOrSlug: string
): Promise<{ scenes: VirtualScene[]; hotspots: VirtualHotspot[] }> {
  try {
    const data = await apiGetRaw<{ scenes?: VirtualScene[]; hotspots?: VirtualHotspot[] }>(
      `/venues/${encodeURIComponent(idOrSlug)}/scenes`
    );
    return {
      scenes: (data as any)?.scenes ?? [],
      hotspots: (data as any)?.hotspots ?? [],
    };
  } catch {
    return { scenes: [], hotspots: [] };
  }
}
