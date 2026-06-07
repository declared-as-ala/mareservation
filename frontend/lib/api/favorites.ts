import { apiGetRaw, api } from './client';
import type { Venue } from './types';

export async function fetchFavorites(): Promise<Venue[]> {
  try {
    const data = await apiGetRaw<Venue[]>('/favorites');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchFavoriteIds(): Promise<string[]> {
  try {
    const data = await apiGetRaw<string[]>('/favorites/ids');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(venueId: string): Promise<{ favorited: boolean }> {
  const res = await api.post<{ data?: { favorited: boolean }; favorited?: boolean }>(
    `/favorites/${venueId}`,
    {}
  );
  const raw = res?.data ?? (res as unknown as { favorited: boolean });
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data: { favorited: boolean } }).data
    : raw;
  return { favorited: data?.favorited ?? false };
}
