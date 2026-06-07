import { api, apiGetRaw } from './client';

export type CoworkingUnit = {
  _id: string;
  venueId: string;
  unitType: 'coworking_desk' | 'coworking_office' | 'coworking_meeting_room';
  label: string;
  code: string;
  capacityMax?: number;
  priceType?: 'perSession' | 'fixed' | 'perPerson' | 'perNight' | 'free';
  basePrice: number;
  status: 'active' | 'inactive' | 'maintenance' | 'hidden';
  isReservable: boolean;
};

export type CoworkingAddon = {
  _id: string;
  venueId: string;
  key: string;
  name: string;
  unitPrice: number;
  isActive: boolean;
  maxQty?: number;
};

export type CoworkingPolicy = {
  openingHour: number;
  closingHour: number;
  halfDayHours: number;
  fullDayHours: number;
  maxBookingHours: number;
  allowOvertime: boolean;
  overtimeAfterHours: number;
  overtimeHourlyRate: number;
};

export type CoworkingBlock = {
  _id: string;
  venueId: string;
  reservableUnitId?: string | { _id: string; label?: string; code?: string; unitType?: string };
  scope: 'unit' | 'venue';
  startsAt: string;
  endsAt: string;
  reason: 'maintenance' | 'private_booking' | 'cleaning' | 'staff_use' | 'owner_hold' | 'other';
  note?: string;
  isActive: boolean;
};

export type CoworkingKpis = {
  totalReservations: number;
  revenue: number;
  bookedHours: number;
  utilizationPct: number;
  activeBlocks: number;
  upcoming: number;
  unitCount: number;
  from: string;
  to: string;
};

export async function fetchOwnerCoworkingUnits(venueId: string): Promise<CoworkingUnit[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: CoworkingUnit[] } | CoworkingUnit[]>(`/owner-coworking/venues/${venueId}/units`);
  return Array.isArray(raw) ? raw : ((raw as { data?: CoworkingUnit[] })?.data ?? []);
}

export async function createOwnerCoworkingUnit(venueId: string, payload: Partial<CoworkingUnit>) {
  await api.post(`/owner-coworking/venues/${venueId}/units`, payload);
}

export async function updateOwnerCoworkingUnit(id: string, payload: Partial<CoworkingUnit>) {
  await api.patch(`/owner-coworking/units/${id}`, payload);
}

export async function deleteOwnerCoworkingUnit(id: string) {
  await api.delete(`/owner-coworking/units/${id}`);
}

export async function fetchOwnerCoworkingAddons(venueId: string): Promise<CoworkingAddon[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: CoworkingAddon[] } | CoworkingAddon[]>(`/owner-coworking/venues/${venueId}/addons`);
  return Array.isArray(raw) ? raw : ((raw as { data?: CoworkingAddon[] })?.data ?? []);
}

export async function createOwnerCoworkingAddon(venueId: string, payload: Partial<CoworkingAddon>) {
  await api.post(`/owner-coworking/venues/${venueId}/addons`, payload);
}

export async function fetchOwnerCoworkingPolicy(venueId: string): Promise<CoworkingPolicy | null> {
  const raw = await apiGetRaw<{ success?: boolean; data?: CoworkingPolicy | null } | CoworkingPolicy | null>(`/owner-coworking/venues/${venueId}/policy`);
  if (!raw) return null;
  return (raw as { data?: CoworkingPolicy | null })?.data ?? (raw as CoworkingPolicy);
}

export async function saveOwnerCoworkingPolicy(venueId: string, payload: CoworkingPolicy): Promise<CoworkingPolicy> {
  const raw = await api.patch<{ success?: boolean; data?: CoworkingPolicy }>(`/owner-coworking/venues/${venueId}/policy`, payload);
  const data = (raw as { data?: { success?: boolean; data?: CoworkingPolicy } })?.data?.data;
  if (data) return data;
  throw new Error('Echec de sauvegarde de la politique coworking.');
}

export async function fetchOwnerCoworkingBlocks(venueId: string): Promise<CoworkingBlock[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: CoworkingBlock[] } | CoworkingBlock[]>(`/owner-coworking/venues/${venueId}/blocks`);
  return Array.isArray(raw) ? raw : ((raw as { data?: CoworkingBlock[] })?.data ?? []);
}

export async function createOwnerCoworkingBlock(venueId: string, payload: Partial<CoworkingBlock>) {
  await api.post(`/owner-coworking/venues/${venueId}/blocks`, payload);
}

export async function deleteOwnerCoworkingBlock(id: string) {
  await api.delete(`/owner-coworking/blocks/${id}`);
}

export async function fetchOwnerCoworkingKpis(venueId: string): Promise<CoworkingKpis | null> {
  const raw = await apiGetRaw<{ success?: boolean; data?: CoworkingKpis | null } | CoworkingKpis | null>(`/owner-coworking/venues/${venueId}/kpis`);
  if (!raw) return null;
  return (raw as { data?: CoworkingKpis | null })?.data ?? (raw as CoworkingKpis);
}
