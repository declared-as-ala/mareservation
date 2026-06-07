import { apiFetch, apiGetRaw, apiPostRaw, apiPatchRaw, apiDeleteRaw } from './client';
import type { MenuItem } from './types';

export async function fetchVenueMenu(venueId: string): Promise<MenuItem[]> {
  const res = await apiFetch<MenuItem[]>(`/menu/venue/${venueId}`);
  return (res.data as MenuItem[]) ?? [];
}

export async function fetchAdminVenueMenu(venueId: string): Promise<MenuItem[]> {
  const res = await apiGetRaw<{ data: MenuItem[] }>(`/menu/admin/venue/${venueId}`);
  return res.data ?? [];
}

export async function createMenuItem(data: Partial<MenuItem>): Promise<MenuItem> {
  const res = await apiPostRaw<{ data: MenuItem }>('/menu', data);
  return res.data;
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
  const res = await apiPatchRaw<{ data: MenuItem }>(`/menu/${id}`, data);
  return res.data;
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiDeleteRaw(`/menu/${id}`);
}
