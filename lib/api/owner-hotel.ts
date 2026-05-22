import { api, apiGetRaw } from './client';

export type RoomBlockReason =
  | 'maintenance'
  | 'private_event'
  | 'owner_hold'
  | 'cleaning'
  | 'renovation'
  | 'staff_use'
  | 'offline_booking'
  | 'emergency'
  | 'other';

export interface RoomBlock {
  _id: string;
  venueId: string;
  roomId?: string;
  scope: 'room' | 'venue';
  startsAt: string;
  endsAt: string;
  reason: RoomBlockReason;
  note?: string;
  visibleToClient: boolean;
  autoReopen: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ManualReservationPayload {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  price?: number;
  paymentStatus?: 'unpaid' | 'paid' | 'pending';
  depositAmount?: number;
  source?: 'phone' | 'walk_in' | 'whatsapp' | 'agency' | 'other';
  notes?: string;
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data;
  return raw as T;
}

export async function fetchBlocks(
  venueId: string,
  params: { from?: string; to?: string; roomId?: string } = {}
): Promise<RoomBlock[]> {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.roomId) q.set('roomId', params.roomId);
  const qs = q.toString();
  const raw = await apiGetRaw<unknown>(`/owner-hotel/venues/${venueId}/blocks${qs ? `?${qs}` : ''}`);
  return unwrap<RoomBlock[]>(raw) ?? [];
}

export async function createBlock(
  venueId: string,
  body: {
    roomId?: string;
    scope?: 'room' | 'venue';
    startsAt: string;
    endsAt: string;
    reason?: RoomBlockReason;
    note?: string;
    visibleToClient?: boolean;
    autoReopen?: boolean;
  }
): Promise<RoomBlock> {
  const res = await api.post<unknown>(`/owner-hotel/venues/${venueId}/blocks`, body);
  return unwrap<RoomBlock>(res);
}

export async function deleteBlock(blockId: string): Promise<void> {
  await api.delete(`/owner-hotel/blocks/${blockId}`);
}

export async function createManualReservation(
  venueId: string,
  body: ManualReservationPayload
): Promise<{ _id: string; reservationCode: string }> {
  const res = await api.post<unknown>(`/owner-hotel/venues/${venueId}/reservations/manual`, body);
  return unwrap(res);
}

export interface PendingReservation {
  _id: string;
  reservationCode?: string;
  startAt: string;
  endAt: string;
  guestFirstName?: string;
  guestLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPrice: number;
  paymentOption?: string;
  createdAt: string;
  venueId?: { _id: string; name: string; slug?: string; city?: string } | string;
  roomId?: { _id: string; name?: string; roomNumber?: number; roomType?: string } | string;
}

export async function fetchPendingReservations(): Promise<PendingReservation[]> {
  const raw = await apiGetRaw<unknown>('/owner-hotel/reservations/pending');
  return unwrap<PendingReservation[]>(raw) ?? [];
}

export async function acceptReservation(id: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/accept`, {});
}

export async function rejectReservation(id: string, reason?: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/reject`, { reason });
}

export async function checkInReservation(id: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/check-in`, {});
}

export async function checkOutReservation(id: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/check-out`, {});
}

export async function cancelReservation(id: string, reason?: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/cancel`, { reason });
}

export async function markNoShow(id: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/no-show`, {});
}

/* ─── Dashboard ──────────────────────────────────────────────────── */

export interface HotelDashboardAlert {
  severity: 'warning' | 'info' | 'critical';
  code: string;
  message: string;
  count?: number;
  href?: string;
}

export interface HotelDashboardKpis {
  reservationsToday: number;
  checkinsToday: number;
  checkoutsToday: number;
  occupiedNow: number;
  availableNow: number;
  totalRooms: number;
  pending: number;
  monthlyRevenue: number;
  monthlyCount: number;
  occupancyRate: number;
  cancellationRate: number;
  activeBlocks: number;
}

export interface DashboardReservation {
  _id: string;
  reservationCode?: string;
  status: string;
  paymentStatus: string;
  checkInStatus?: 'not_checked_in' | 'checked_in';
  startAt: string;
  endAt: string;
  guestFirstName?: string;
  guestLastName?: string;
  customerPhone?: string;
  customerEmail?: string;
  totalPrice: number;
  amountPaid?: number;
  remainingAmount?: number;
  arrivalTime?: string;
  partySize?: number;
  adults?: number;
  children?: number;
  roomId?: { _id?: string; name?: string; roomNumber?: number; roomType?: string } | string;
}

export interface HotelDashboardResponse {
  venue: { _id: string; name: string; slug?: string; city?: string; coverImage?: string };
  kpis: HotelDashboardKpis;
  checkinsToday: DashboardReservation[];
  checkoutsToday: DashboardReservation[];
  upcomingNext7: DashboardReservation[];
  alerts: HotelDashboardAlert[];
}

export async function fetchHotelDashboard(venueId: string): Promise<HotelDashboardResponse> {
  const raw = await apiGetRaw<unknown>(`/owner-hotel/venues/${venueId}/dashboard`);
  return unwrap<HotelDashboardResponse>(raw);
}

/* ─── Reservations list & mutations ──────────────────────────────── */

export interface OwnerReservation {
  _id: string;
  reservationCode?: string;
  confirmationCode: string;
  status: string;
  paymentStatus: string;
  paymentOption?: string;
  paymentMethod?: string;
  checkInStatus?: 'not_checked_in' | 'checked_in';
  startAt: string;
  endAt: string;
  nights?: number;
  partySize?: number;
  adults?: number;
  children?: number;
  guestFirstName?: string;
  guestLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPrice: number;
  amountPaid?: number;
  remainingAmount?: number;
  source?: string;
  notes?: string;
  arrivalTime?: string;
  createdAt: string;
  venueId?: { _id: string; name: string; slug?: string; city?: string } | string;
  roomId?: { _id: string; name?: string; roomNumber?: number; roomType?: string; pricePerNight?: number } | string;
}

export async function fetchOwnerHotelReservations(params: {
  venueId?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
} = {}): Promise<OwnerReservation[]> {
  const q = new URLSearchParams();
  if (params.venueId) q.set('venueId', params.venueId);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.q) q.set('q', params.q);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await apiGetRaw<unknown>(`/owner-hotel/reservations${qs ? `?${qs}` : ''}`);
  return unwrap<OwnerReservation[]>(raw) ?? [];
}

export async function changeReservationDates(id: string, startAt: string, endAt: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/change-dates`, { startAt, endAt });
}

export async function reassignRoom(id: string, roomId: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/reassign-room`, { roomId });
}

export async function addReservationNote(id: string, text: string): Promise<void> {
  await api.post(`/owner-hotel/reservations/${id}/note`, { text });
}

export async function submitVenueForReview(
  venueId: string,
  docs?: Array<{ url: string; label: string }>,
  note?: string,
): Promise<void> {
  await api.post(`/owner-hotel/venues/${venueId}/submit-for-review`, { docs, note });
}
