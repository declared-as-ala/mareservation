import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from './client';

export function fetchOwnerMenus() {
  return apiGetRaw<{ success: boolean; data: unknown[] }>('/menu-du-jour/owner');
}

export function createOwnerMenu(payload: Record<string, unknown>) {
  return apiPostRaw('/menu-du-jour/owner', payload);
}

export function updateOwnerMenu(id: string, payload: Record<string, unknown>) {
  return apiPatchRaw(`/menu-du-jour/owner/${id}`, payload);
}

export function deleteOwnerMenu(id: string) {
  return apiDeleteRaw(`/menu-du-jour/owner/${id}`);
}

export function fetchActiveVenueMenu(venueId: string) {
  return apiGetRaw<{ success: boolean; data?: unknown }>(`/menu-du-jour/venue/${venueId}/active`);
}
