import { api, apiGetRaw } from './client';
import type { AdminHotelRoom } from './admin';

function unwrap<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if ('rooms' in r) return r.rooms as T;
  if ('data' in r) return r.data as T;
  return raw as T;
}

export async function fetchOwnerRooms(hotelId: string): Promise<AdminHotelRoom[]> {
  const raw = await apiGetRaw<unknown>(`/owner/hotels/${hotelId}/rooms`);
  return unwrap<AdminHotelRoom[]>(raw) ?? [];
}

export async function createOwnerRoom(hotelId: string, payload: Partial<AdminHotelRoom>): Promise<AdminHotelRoom> {
  const raw = await api.post<unknown>(`/owner/hotels/${hotelId}/rooms`, payload);
  return (unwrap<AdminHotelRoom>(raw) ?? (raw as unknown as AdminHotelRoom));
}

export async function updateOwnerRoom(roomId: string, payload: Partial<AdminHotelRoom>): Promise<AdminHotelRoom> {
  const raw = await api.patch<unknown>(`/owner/rooms/${roomId}`, payload);
  return (unwrap<AdminHotelRoom>(raw) ?? (raw as unknown as AdminHotelRoom));
}

export async function deleteOwnerRoom(roomId: string): Promise<void> {
  await api.delete(`/owner/rooms/${roomId}`);
}
