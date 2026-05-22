import { apiGetRaw } from './client';
import type { Reservation, Venue } from './types';

export type OwnerDashboardResponse = {
  venues: Venue[];
  serviceDomains?: string[];
  stats: {
    totalVenues: number;
    totalReservations: number;
    upcomingReservations: number;
    confirmedReservations: number;
  };
  recentReservations: Reservation[];
};

export async function fetchOwnerDashboard(): Promise<OwnerDashboardResponse | null> {
  try {
    return await apiGetRaw<OwnerDashboardResponse>('/owner/dashboard');
  } catch {
    return null;
  }
}

export async function fetchOwnerVenues(): Promise<Venue[]> {
  try {
    const raw = await apiGetRaw<Venue[] | { venues?: Venue[] }>('/owner/venues');
    if (Array.isArray(raw)) return raw;
    return (raw as { venues?: Venue[] })?.venues ?? [];
  } catch {
    return [];
  }
}
