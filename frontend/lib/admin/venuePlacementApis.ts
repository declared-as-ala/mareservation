import type { Panorama360EditorApis } from '@/components/dashboard/Panorama360Editor';
import {
  fetchAdminVenueScenes,
  createAdminVenueScene,
  deleteAdminVenueScene,
  createAdminSceneHotspot,
  deleteAdminSceneHotspot,
  fetchAdminTablePlacements,
  createAdminTablePlacement,
  updateAdminTablePlacement,
  deleteAdminTablePlacement,
  fetchAdminVenueTables,
  createAdminTable,
  updateAdminTable,
  deleteAdminTable,
  fetchAdminReservableUnits,
} from '@/lib/api/admin';
import { fetchOwnerCoworkingBlocks, deleteOwnerCoworkingBlock } from '@/lib/api/owner-coworking';

const sceneCommon = {
  fetchScenes: async (venueId: string) => {
    const data = await fetchAdminVenueScenes(venueId);
    return data.scenes.map((scene) => ({ _id: scene._id, name: scene.name, image: scene.image }));
  },
  createScene: (venueId: string, payload: { name: string; image: string; description?: string }) =>
    createAdminVenueScene(venueId, payload),
  deleteScene: (_venueId: string, sceneId: string) => deleteAdminVenueScene(sceneId),
  fetchHotspots: async (venueId: string) => {
    const data = await fetchAdminVenueScenes(venueId);
    return data.hotspots;
  },
  createHotspot: (venueId: string, payload: any) => createAdminSceneHotspot({ venueId, ...payload }),
  deleteHotspot: (_venueId: string, hotspotId: string) => deleteAdminSceneHotspot(hotspotId),
  fetchPlacements: (venueId: string) => fetchAdminTablePlacements(venueId),
  updatePlacement: (_venueId: string, placementId: string, payload: any) => updateAdminTablePlacement(placementId, payload),
  deletePlacement: (_venueId: string, placementId: string) => deleteAdminTablePlacement(placementId),
};

/** Tables + 360 placement (restaurants & cafés). Self-contained (no outer state). */
export function buildTablePlacementApis(): Panorama360EditorApis {
  return {
    ...sceneCommon,
    createPlacement: (venueId, payload) =>
      createAdminTablePlacement({ venueId, sceneId: payload.sceneId, yaw: payload.yaw, pitch: payload.pitch, tableId: payload.tableId }),
    fetchTables: (venueId) => fetchAdminVenueTables(venueId),
    createTable: async (venueId, payload) => {
      const existing = await fetchAdminVenueTables(venueId);
      const tableNumber = Math.max(0, ...existing.map((t) => Number(t.tableNumber || 0))) + 1;
      return createAdminTable({
        venueId,
        tableNumber,
        name: payload.name,
        capacity: payload.capacity,
        capacityMax: payload.capacity,
        price: payload.price,
        minimumSpend: payload.minimumSpend,
        isVip: payload.isVip,
        defaultStatus: 'available',
      });
    },
    updateTable: (_venueId, tableId, payload) => updateAdminTable(tableId, payload),
    deleteTable: (_venueId, tableId) => deleteAdminTable(tableId),
  } as Panorama360EditorApis;
}

/** Reservable units + 360 placement (coworking). */
export function buildUnitPlacementApis(): Panorama360EditorApis {
  return {
    ...sceneCommon,
    createPlacement: (venueId, payload) =>
      createAdminTablePlacement({ venueId, sceneId: payload.sceneId, yaw: payload.yaw, pitch: payload.pitch, reservableUnitId: payload.reservableUnitId }),
    fetchUnits: (venueId) => fetchAdminReservableUnits(venueId),
    fetchBlocks: fetchOwnerCoworkingBlocks,
    deleteBlock: deleteOwnerCoworkingBlock,
  } as Panorama360EditorApis;
}
