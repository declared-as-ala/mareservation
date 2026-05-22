import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw, uploadImageFile } from './client';

export type OwnerVenueMediaPayload = {
  coverImage?: string;
  gallery?: string[];
  immersiveType?: 'none' | 'virtual-tour' | 'view-360';
  immersiveSourceType?: 'url' | 'upload' | null;
  immersiveFile?: string | null;
};

export type OwnerScene = {
  _id: string;
  name: string;
  image: string;
};

export type OwnerSceneHotspot = {
  _id: string;
  venueId: string;
  virtualTourId: string;
  label: string;
  targetType: 'scene' | string;
  targetId: string;
  xPercent: number;
  yPercent: number;
  yaw?: number;
  pitch?: number;
  isActive: boolean;
};

export async function fetchOwnerVenueScenes(venueId: string): Promise<OwnerScene[]> {
  const response = await apiGetRaw<{ success?: boolean; data?: OwnerScene[] }>(`/owner/venues/${venueId}/scenes`);
  return response?.data ?? [];
}

export async function patchOwnerVenueMedia(venueId: string, payload: OwnerVenueMediaPayload) {
  await apiPatchRaw(`/owner/venues/${venueId}`, payload);
}

export async function uploadOwnerVenueCover(venueId: string, file: File) {
  const coverImage = await uploadImageFile(file);
  await patchOwnerVenueMedia(venueId, { coverImage });
  return coverImage;
}

export async function appendOwnerVenueGalleryImage(
  venueId: string,
  currentGallery: string[],
  file: File
) {
  const imageUrl = await uploadImageFile(file);
  const gallery = [...currentGallery, imageUrl];
  await patchOwnerVenueMedia(venueId, { gallery });
  return { imageUrl, gallery };
}

export async function removeOwnerVenueGalleryImage(
  venueId: string,
  currentGallery: string[],
  imageUrl: string
) {
  const gallery = currentGallery.filter((item) => item !== imageUrl);
  await patchOwnerVenueMedia(venueId, { gallery });
  return gallery;
}

export async function createOwnerVenueScene(venueId: string, payload: { name: string; image: string }) {
  await apiPostRaw(`/owner/venues/${venueId}/scenes`, payload);
}

export async function deleteOwnerVenueScene(venueId: string, sceneId: string) {
  await apiDeleteRaw(`/owner/venues/${venueId}/scenes/${sceneId}`);
}

export async function fetchOwnerVenueSceneHotspots(venueId: string): Promise<OwnerSceneHotspot[]> {
  const response = await apiGetRaw<{ success?: boolean; data?: OwnerSceneHotspot[] }>(
    `/owner/venues/${venueId}/scene-hotspots`
  );
  return response?.data ?? [];
}

export async function createOwnerVenueSceneHotspot(
  venueId: string,
  payload: {
    sceneId: string;
    targetSceneId: string;
    label: string;
    xPercent: number;
    yPercent: number;
    yaw?: number;
    pitch?: number;
  }
) {
  const response = await apiPostRaw<{ success?: boolean; data?: OwnerSceneHotspot }>(
    `/owner/venues/${venueId}/scene-hotspots`,
    payload
  );
  return response?.data ?? response;
}

export async function deleteOwnerVenueSceneHotspot(venueId: string, hotspotId: string) {
  await apiDeleteRaw(`/owner/venues/${venueId}/scene-hotspots/${hotspotId}`);
}

export async function uploadOwnerVenueImmersiveSet(
  venueId: string,
  files: File[],
  options?: { baseSceneName?: string; currentImmersiveFile?: string | null }
) {
  let primary = options?.currentImmersiveFile || '';
  for (const [idx, file] of files.entries()) {
    const url = await uploadImageFile(file);
    if (!primary) {
      primary = url;
      await patchOwnerVenueMedia(venueId, {
        immersiveType: 'view-360',
        immersiveSourceType: 'upload',
        immersiveFile: url,
      });
    } else {
      const name = options?.baseSceneName?.trim() || `Snapshot ${idx + 1}`;
      await createOwnerVenueScene(venueId, { name, image: url });
    }
  }
  return primary;
}
