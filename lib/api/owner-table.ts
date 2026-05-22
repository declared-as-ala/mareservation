import { api, apiGetRaw } from './client';

export type TablePolicy = {
  _id?: string;
  venueId: string;
  slotMinutes: number;
  reservationDurationMinutes: number;
  openingHour: number;
  closingHour: number;
  shifts: Array<{ name: string; startHour: number; endHour: number }>;
  depositRequired: boolean;
  depositType: 'none' | 'fixed' | 'percent';
  depositValue: number;
  cancellationCutoffMinutes: number;
  noShowGraceMinutes: number;
};

export type TableBlock = {
  _id: string;
  venueId: string;
  tableId?: string | null;
  zone?: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  note?: string;
  isActive: boolean;
};

export type OwnerTableReservation = {
  _id: string;
  reservationCode?: string;
  status: string;
  paymentStatus?: string;
  startAt: string;
  endAt: string;
  partySize?: number;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  totalPrice?: number;
  orderType?: 'table_only' | 'with_menu';
  menuTotal?: number;
  menuPrepStatus?: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  menuPrepUpdatedAt?: string;
  venueId?: { _id: string; name?: string; city?: string } | string;
  tableId?: { _id: string; tableNumber?: number; name?: string } | string;
};

export type OwnerMenuItem = {
  _id: string;
  venueId: string;
  name: string;
  description?: string;
  price: number;
  category: 'entree' | 'plat' | 'dessert' | 'boisson' | 'autre';
  isAvailable: boolean;
  isPopular: boolean;
  trackStock?: boolean;
  stockQty?: number;
  availableFrom?: string;
  availableTo?: string;
};

export async function fetchOwnerTablePolicy(venueId: string): Promise<TablePolicy | null> {
  const raw = await apiGetRaw<{ success?: boolean; data?: TablePolicy | null } | TablePolicy | null>(`/owner-table/venues/${venueId}/policy`);
  const data = (raw as { data?: TablePolicy | null })?.data ?? (raw as TablePolicy | null);
  return data || null;
}

export async function saveOwnerTablePolicy(venueId: string, payload: Partial<TablePolicy>): Promise<TablePolicy> {
  const raw = await api.patch<{ success?: boolean; data?: TablePolicy }>(`/owner-table/venues/${venueId}/policy`, payload);
  const data = (raw as { data?: { data?: TablePolicy } })?.data?.data ?? (raw as unknown as TablePolicy);
  return data;
}

export async function fetchOwnerTableBlocks(venueId: string, query?: { from?: string; to?: string }): Promise<TableBlock[]> {
  const qs = new URLSearchParams();
  if (query?.from) qs.set('from', query.from);
  if (query?.to) qs.set('to', query.to);
  const raw = await apiGetRaw<{ success?: boolean; data?: TableBlock[] } | TableBlock[]>(`/owner-table/venues/${venueId}/blocks${qs.toString() ? `?${qs}` : ''}`);
  return Array.isArray(raw) ? raw : ((raw as { data?: TableBlock[] })?.data ?? []);
}

export async function createOwnerTableBlock(venueId: string, payload: { tableId?: string; zone?: string; startsAt: string; endsAt: string; reason: string; note?: string }) {
  await api.post(`/owner-table/venues/${venueId}/blocks`, payload);
}

export async function deleteOwnerTableBlock(id: string) {
  await api.delete(`/owner-table/blocks/${id}`);
}

export async function fetchOwnerTableReservations(query?: { status?: string; venueId?: string; from?: string; to?: string; q?: string }): Promise<OwnerTableReservation[]> {
  const qs = new URLSearchParams();
  if (query?.status) qs.set('status', query.status);
  if (query?.venueId) qs.set('venueId', query.venueId);
  if (query?.from) qs.set('from', query.from);
  if (query?.to) qs.set('to', query.to);
  if (query?.q) qs.set('q', query.q);
  const raw = await apiGetRaw<{ success?: boolean; data?: OwnerTableReservation[] } | OwnerTableReservation[]>(`/owner-table/reservations${qs.toString() ? `?${qs}` : ''}`);
  return Array.isArray(raw) ? raw : ((raw as { data?: OwnerTableReservation[] })?.data ?? []);
}

export async function checkInOwnerTableReservation(id: string) {
  await api.post(`/owner-table/reservations/${id}/check-in`, {});
}
export async function checkOutOwnerTableReservation(id: string) {
  await api.post(`/owner-table/reservations/${id}/check-out`, {});
}
export async function noShowOwnerTableReservation(id: string) {
  await api.post(`/owner-table/reservations/${id}/no-show`, {});
}

export async function fetchOwnerPreorders(query?: { venueId?: string; prepStatus?: string }): Promise<OwnerTableReservation[]> {
  const qs = new URLSearchParams();
  if (query?.venueId) qs.set('venueId', query.venueId);
  if (query?.prepStatus) qs.set('prepStatus', query.prepStatus);
  const raw = await apiGetRaw<{ success?: boolean; data?: OwnerTableReservation[] } | OwnerTableReservation[]>(`/owner-table/preorders${qs.toString() ? `?${qs}` : ''}`);
  return Array.isArray(raw) ? raw : ((raw as { data?: OwnerTableReservation[] })?.data ?? []);
}

export async function updatePreorderPrepStatus(id: string, status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled') {
  await api.patch(`/owner-table/preorders/${id}/prep-status`, { status });
}

export async function fetchOwnerVenueMenuItems(venueId: string): Promise<OwnerMenuItem[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: OwnerMenuItem[] } | OwnerMenuItem[]>(`/owner-table/venues/${venueId}/menu-items`);
  return Array.isArray(raw) ? raw : ((raw as { data?: OwnerMenuItem[] })?.data ?? []);
}

export async function updateOwnerMenuItem(id: string, payload: Partial<OwnerMenuItem>) {
  await api.patch(`/owner-table/menu-items/${id}`, payload);
}
