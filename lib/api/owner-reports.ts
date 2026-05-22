import { apiFetch } from './client';

export interface RoomTypeStat {
  type: string;
  count: number;
  revenue: number;
}

export interface MonthStat {
  month: number;
  count: number;
  revenue: number;
}

export interface DayStat {
  day: number;
  count: number;
  revenue: number;
}

export interface TopRoom {
  roomId: string;
  name: string;
  nights: number;
  revenue: number;
}

export interface RevenueReport {
  totalRevenue: number;
  totalNights: number;
  reservationCount: number;
  avgDailyRate: number;
  occupancyRate: number;
  cancellationRate: number;
  noShowRate: number;
  byRoomType: RoomTypeStat[];
  byMonth: MonthStat[];
  byDay: DayStat[];
  topRooms: TopRoom[];
}

export async function fetchOwnerRevenue(params: {
  venueId?: string;
  period: 'month' | 'year';
  year: number;
  month?: number;
}): Promise<RevenueReport> {
  const qs = new URLSearchParams();
  if (params.venueId) qs.set('venueId', params.venueId);
  qs.set('period', params.period);
  qs.set('year', String(params.year));
  if (params.month != null) qs.set('month', String(params.month));
  const res = await apiFetch<RevenueReport>(`/owner/revenue?${qs}`);
  // The endpoint returns the report directly (not nested in data)
  return (res.data ?? res) as unknown as RevenueReport;
}
