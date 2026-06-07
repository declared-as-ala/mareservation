import { api, apiGetRaw } from './client';
import type { Reservation } from './types';

export type TableAvailabilityTimeline = {
  tableId: string;
  date: string;
  slotMinutes: number;
  reservationDurationMinutes: number;
  reservedRanges: Array<{
    startAt: string;
    endAt: string;
    source: 'reservation' | 'hold' | 'block';
    status: string;
  }>;
  slots: Array<{
    time: string;
    startAt: string;
    endAt: string;
    available: boolean;
  }>;
};

export async function fetchMyReservations(): Promise<Reservation[]> {
  const data = await apiGetRaw<Reservation[]>('/reservations/me');
  return Array.isArray(data) ? data : [];
}

export async function fetchTableAvailabilityTimeline(tableId: string, date: string): Promise<TableAvailabilityTimeline> {
  const raw = await apiGetRaw<{ success?: boolean; data?: TableAvailabilityTimeline } | TableAvailabilityTimeline>(
    `/reservations/availability/table/${tableId}?date=${encodeURIComponent(date)}`
  );
  const data = (raw as { data?: TableAvailabilityTimeline })?.data ?? (raw as TableAvailabilityTimeline);
  if (data && Array.isArray(data.slots)) return data;
  throw new Error('Disponibilites de table indisponibles');
}

export async function fetchReservationById(id: string): Promise<Reservation | null> {
  try {
    const raw = await apiGetRaw<{ success?: boolean; data?: Reservation } | Reservation>(`/reservations/me/${id}`);
    const data = (raw as { data?: Reservation })?.data ?? (raw as Reservation);
    return data && typeof data === 'object' && '_id' in data ? data : null;
  } catch {
    return null;
  }
}

export async function createReservation(body: {
  venueId: string;
  reservableUnitId?: string;
  tableId?: string;
  roomId?: string;
  seatId?: string;
  startAt: string;
  endAt: string;
  partySize?: number;
  bookingType: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  guestEmail?: string;
  orderType?: 'table_only' | 'with_menu';
  menuItems?: Array<{ itemId: string; quantity: number }>;
  coworkingDurationType?: 'hourly' | 'half_day' | 'full_day';
  coworkingHours?: number;
  coworkingAddons?: Array<{ key: string; name: string; quantity: number; unitPrice: number }>;
}): Promise<{ _id: string; confirmationCode?: string }> {
  const res = await api.post<{ data?: { _id: string; confirmationCode?: string }; _id?: string; confirmationCode?: string }>(
    '/reservations',
    body
  );
  const raw = res?.data ?? (res as unknown as { _id: string; confirmationCode?: string });
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data: { _id: string; confirmationCode?: string } }).data
    : raw;
  if (data && data._id) return { _id: data._id, confirmationCode: data.confirmationCode };
  throw new Error('Creation de reservation echouee');
}

export async function createReservationHold(body: {
  venueId: string;
  reservableUnitId?: string;
  tableId?: string;
  roomId?: string;
  seatId?: string;
  startsAt: string;
  endsAt: string;
  peopleCount?: number;
}): Promise<{ _id: string; expiresAt: string }> {
  const res = await api.post<{ data?: { _id: string; expiresAt: string }; _id?: string; expiresAt?: string }>(
    '/reservations/holds',
    body
  );
  const raw = res?.data ?? (res as unknown as { _id: string; expiresAt?: string });
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data: { _id: string; expiresAt: string } }).data
    : raw;
  if (data && data._id && data.expiresAt) return { _id: data._id, expiresAt: data.expiresAt };
  throw new Error('Creation de hold echouee');
}

export async function releaseReservationHold(id: string): Promise<void> {
  await api.delete(`/reservations/holds/${id}`);
}

export async function cancelReservation(id: string): Promise<void> {
  await api.patch(`/reservations/me/${id}/cancel`, {});
}
