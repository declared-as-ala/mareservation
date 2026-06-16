import { apiFetch, apiGetRaw } from './client';

export type PartnerApplicationStatus = 'new' | 'in_review' | 'contacted' | 'closed';

export interface PartnerApplicationPayload {
  establishmentName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  message?: string;
}

export interface PartnerApplicationRecord {
  _id: string;
  establishmentName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  message?: string;
  status: PartnerApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerApplicationListResponse {
  success: boolean;
  data: PartnerApplicationRecord[];
  total: number;
  page: number;
  pages: number;
}

export async function submitPartnerApplication(
  payload: PartnerApplicationPayload
): Promise<{ success: boolean; data: PartnerApplicationRecord }> {
  const res = await apiFetch<PartnerApplicationRecord>('/partner-applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { success: res.success, data: res.data };
}

export async function listPartnerApplications(params?: {
  page?: number;
  status?: string;
}): Promise<PartnerApplicationListResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.append('page', String(params.page));
  if (params?.status) sp.append('status', params.status);
  const q = sp.toString();
  return apiGetRaw<PartnerApplicationListResponse>(`/partner-applications${q ? `?${q}` : ''}`);
}

export async function updatePartnerApplicationStatus(
  id: string,
  status: PartnerApplicationStatus
): Promise<PartnerApplicationRecord> {
  const res = await apiFetch<PartnerApplicationRecord>(`/partner-applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}
