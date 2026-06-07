import { apiFetch, apiPostRaw, apiPatchRaw } from './client';

export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'on_hold' | 'rejected';

export interface PayoutItem {
  reservationId: string;
  reservationCode?: string;
  gross: number;
  commission: number;
  net: number;
  startAt: string;
  endAt: string;
}

export interface Payout {
  _id: string;
  venueId: { _id: string; name: string; type: string; coverImage?: string } | string;
  ownerId: { _id: string; name: string; email: string; phone?: string } | string;
  periodStart: string;
  periodEnd: string;
  items: PayoutItem[];
  gross: number;
  commission: number;
  commissionRate: number;
  net: number;
  currency: string;
  status: PayoutStatus;
  statusReason?: string;
  paidAt?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerBalanceVenue {
  _id: string;
  venueName: string;
  commissionRate: number;
  gross: number;
  commission: number;
  net: number;
  reservationCount: number;
}

export interface OwnerBalance {
  venues: OwnerBalanceVenue[];
  totalUnpaid: number;
  currency: string;
}

export async function fetchOwnerBalance(): Promise<OwnerBalance> {
  const res = await apiFetch<OwnerBalance>('/payouts/owner/balance');
  return res.data;
}

export async function fetchOwnerPayouts(params?: { page?: number; limit?: number; status?: string }): Promise<{ data: Payout[]; meta: { total: number; page: number; pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  const res = await apiFetch<Payout[]>(`/payouts/owner?${qs}`);
  return { data: res.data ?? [], meta: (res.meta as any) ?? { total: 0, page: 1, pages: 1 } };
}

export async function fetchOwnerPayoutDetail(id: string): Promise<Payout> {
  const res = await apiFetch<Payout>(`/payouts/owner/${id}`);
  return res.data;
}

export async function fetchAdminPayouts(params?: { page?: number; status?: string; venueId?: string; ownerId?: string }): Promise<{ data: Payout[]; meta: { total: number; page: number; pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.status) qs.set('status', params.status);
  if (params?.venueId) qs.set('venueId', params.venueId);
  if (params?.ownerId) qs.set('ownerId', params.ownerId);
  const res = await apiFetch<Payout[]>(`/payouts/admin?${qs}`);
  return { data: res.data ?? [], meta: (res.meta as any) ?? { total: 0, page: 1, pages: 1 } };
}

export async function fetchAdminPayoutDetail(id: string): Promise<Payout> {
  const res = await apiFetch<Payout>(`/payouts/admin/${id}`);
  return res.data;
}

export async function adminGeneratePayout(payload: { venueId: string; periodStart: string; periodEnd: string }): Promise<Payout> {
  const res = await apiPostRaw<{ data: Payout }>('/payouts/admin/generate', payload);
  return (res as any).data;
}

export async function adminApprovePayout(id: string, notes?: string): Promise<Payout> {
  const res = await apiPatchRaw<{ data: Payout }>(`/payouts/admin/${id}/approve`, { notes });
  return (res as any).data;
}

export async function adminMarkPayoutPaid(id: string, payload?: { paymentReference?: string; notes?: string }): Promise<Payout> {
  const res = await apiPatchRaw<{ data: Payout }>(`/payouts/admin/${id}/mark-paid`, payload ?? {});
  return (res as any).data;
}

export async function adminHoldPayout(id: string, reason?: string): Promise<Payout> {
  const res = await apiPatchRaw<{ data: Payout }>(`/payouts/admin/${id}/hold`, { reason });
  return (res as any).data;
}

export async function adminRejectPayout(id: string, reason?: string): Promise<Payout> {
  const res = await apiPatchRaw<{ data: Payout }>(`/payouts/admin/${id}/reject`, { reason });
  return (res as any).data;
}
