import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from './client';
import type { AdminTablePlacement, AdminTableRow } from './admin';
import type { CoworkingUnit } from './owner-coworking';
import type { OwnerScene } from './owner-media';

export async function fetchOwnerVenueTables(venueId: string): Promise<AdminTableRow[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: AdminTableRow[] } | AdminTableRow[]>(
    `/owner/venues/${venueId}/tables`
  );
  return Array.isArray(raw) ? raw : ((raw as { data?: AdminTableRow[] })?.data ?? []);
}

export async function createOwnerVenueTable(
  venueId: string,
  payload: { name?: string; capacity: number; price: number; minimumSpend?: number; isVip?: boolean }
) {
  return apiPostRaw<{ success?: boolean; data?: AdminTableRow }>(`/owner/venues/${venueId}/tables`, payload);
}

export async function updateOwnerVenueTable(
  venueId: string,
  tableId: string,
  payload: Partial<{ name: string; capacity: number; price: number; minimumSpend?: number; isVip: boolean }>
) {
  return apiPatchRaw<{ success?: boolean; data?: AdminTableRow }>(
    `/owner/venues/${venueId}/tables/${tableId}`,
    payload
  );
}

export async function deleteOwnerVenueTable(venueId: string, tableId: string) {
  return apiDeleteRaw(`/owner/venues/${venueId}/tables/${tableId}`);
}

export async function fetchOwnerTablePlacements(venueId: string): Promise<AdminTablePlacement[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: AdminTablePlacement[] } | AdminTablePlacement[]>(
    `/owner/venues/${venueId}/table-placements`
  );
  return Array.isArray(raw) ? raw : ((raw as { data?: AdminTablePlacement[] })?.data ?? []);
}

export async function createOwnerTablePlacement(
  venueId: string,
  payload: { tableId: string; sceneId: string; yaw: number; pitch: number }
) {
  return apiPostRaw<{ success?: boolean; data?: AdminTablePlacement }>(
    `/owner/venues/${venueId}/table-placements`,
    payload
  );
}

export async function updateOwnerTablePlacement(
  venueId: string,
  placementId: string,
  payload: { yaw: number; pitch: number }
) {
  return apiPatchRaw<{ success?: boolean; data?: AdminTablePlacement }>(
    `/owner/venues/${venueId}/table-placements/${placementId}`,
    payload
  );
}

export async function deleteOwnerTablePlacement(venueId: string, placementId: string) {
  return apiDeleteRaw(`/owner/venues/${venueId}/table-placements/${placementId}`);
}

export async function fetchOwnerUnitPlacements(venueId: string): Promise<AdminTablePlacement[]> {
  const raw = await apiGetRaw<{ success?: boolean; data?: AdminTablePlacement[] } | AdminTablePlacement[]>(
    `/owner/venues/${venueId}/unit-placements`
  );
  return Array.isArray(raw) ? raw : ((raw as { data?: AdminTablePlacement[] })?.data ?? []);
}

export async function createOwnerUnitPlacement(
  venueId: string,
  payload: { reservableUnitId: string; sceneId: string; yaw: number; pitch: number }
) {
  return apiPostRaw<{ success?: boolean; data?: AdminTablePlacement }>(
    `/owner/venues/${venueId}/unit-placements`,
    payload
  );
}

export async function updateOwnerUnitPlacement(
  venueId: string,
  placementId: string,
  payload: { yaw: number; pitch: number }
) {
  return apiPatchRaw<{ success?: boolean; data?: AdminTablePlacement }>(
    `/owner/venues/${venueId}/unit-placements/${placementId}`,
    payload
  );
}

export async function deleteOwnerUnitPlacement(venueId: string, placementId: string) {
  return apiDeleteRaw(`/owner/venues/${venueId}/unit-placements/${placementId}`);
}

export type PanoramaPlacementSceneSource = {
  fetchScenes: (venueId: string) => Promise<OwnerScene[]>;
};

export type PanoramaPlacementTableSource = {
  fetchTables: (venueId: string) => Promise<AdminTableRow[]>;
  createTable: (
    venueId: string,
    payload: { name?: string; capacity: number; price: number; minimumSpend?: number; isVip?: boolean }
  ) => Promise<unknown>;
  updateTable: (
    venueId: string,
    tableId: string,
    payload: Partial<{ name: string; capacity: number; price: number; minimumSpend?: number; isVip: boolean }>
  ) => Promise<unknown>;
  deleteTable: (venueId: string, tableId: string) => Promise<unknown>;
};

export type PanoramaPlacementUnitSource = {
  fetchUnits: (venueId: string) => Promise<CoworkingUnit[]>;
};

