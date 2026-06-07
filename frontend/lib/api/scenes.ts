import { apiGetRaw, api } from './client';
import type { Scene } from './types';

export async function fetchScenes(venueId: string): Promise<Scene[]> {
  try {
    const data = await apiGetRaw<Scene[]>(`/scenes?venueId=${venueId}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createScene(body: {
  venueId: string;
  name: string;
  description?: string;
  image: string;
  order?: number;
}): Promise<Scene> {
  const res = await api.post<{ data?: Scene } | Scene>('/scenes', body);
  const raw = res?.data ?? (res as unknown as Scene);
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data: Scene }).data
    : raw;
  if (!data) throw new Error('Erreur lors de la création.');
  return data as Scene;
}

export async function updateScene(
  id: string,
  body: Partial<{ name: string; description: string; image: string; order: number; isActive: boolean }>
): Promise<Scene> {
  const res = await api.patch<{ data?: Scene } | Scene>(`/scenes/${id}`, body);
  const raw = res?.data ?? (res as unknown as Scene);
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data: Scene }).data
    : raw;
  if (!data) throw new Error('Erreur.');
  return data as Scene;
}

export async function deleteScene(id: string): Promise<void> {
  await api.delete(`/scenes/${id}`);
}
