import { apiFetch, apiPatchRaw, apiPostRaw } from './client';

export interface OwnerUser {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  createdAt: string;
  venueCount: number;
  emailVerified?: boolean;
  serviceDomains?: string[];
}

export interface OwnersListResponse {
  success: boolean;
  data: OwnerUser[];
  total: number;
  page: number;
  pages: number;
}

export async function fetchAdminOwners(params?: {
  q?: string;
  status?: 'active' | 'suspended' | '';
  page?: number;
  limit?: number;
}): Promise<OwnersListResponse> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const res = await apiFetch<OwnerUser[]>(`/admin/owners?${qs}`);
  return res as unknown as OwnersListResponse;
}

export async function suspendOwner(id: string, reason?: string): Promise<OwnerUser> {
  const res = await apiPatchRaw<{ success: boolean; data: OwnerUser }>(`/admin/owners/${id}/suspend`, { reason });
  return (res as any).data;
}

export async function reactivateOwner(id: string): Promise<OwnerUser> {
  const res = await apiPatchRaw<{ success: boolean; data: OwnerUser }>(`/admin/owners/${id}/reactivate`, {});
  return (res as any).data;
}

export async function verifyOwner(id: string): Promise<OwnerUser> {
  const res = await apiPatchRaw<{ success: boolean; data: OwnerUser }>(`/admin/owners/${id}/verify`, {});
  return (res as any).data;
}

export async function unverifyOwner(id: string): Promise<OwnerUser> {
  const res = await apiPatchRaw<{ success: boolean; data: OwnerUser }>(`/admin/owners/${id}/unverify`, {});
  return (res as any).data;
}

export async function updateOwnerCommissionRate(id: string, commissionRate: number): Promise<{ success: boolean; message: string }> {
  const res = await apiPatchRaw<{ success: boolean; message: string }>(`/admin/owners/${id}/commission-rate`, { commissionRate });
  return res as { success: boolean; message: string };
}

export async function inviteOwner(payload: {
  fullName: string;
  email: string;
  phone?: string;
  role?: 'ESTABLISHMENT_OWNER' | 'ORGANIZER';
  serviceDomains?: string[];
}): Promise<{ success: boolean; data: OwnerUser }> {
  const res = await apiPostRaw<{ success: boolean; data: OwnerUser }>(`/admin/owners/invite`, payload);
  return res;
}

export async function updateOwnerServiceDomains(id: string, serviceDomains: string[]): Promise<OwnerUser> {
  const res = await apiPatchRaw<{ success: boolean; data: OwnerUser }>(`/admin/owners/${id}/service-domains`, { serviceDomains });
  return (res as any).data;
}
