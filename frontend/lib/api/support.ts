import { apiFetch, apiPostRaw, apiPatchRaw } from './client';

export type SupportCaseStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportCaseCategory = 'reservation' | 'payment' | 'venue' | 'account' | 'other';
export type SupportCasePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SupportMessage {
  _id?: string;
  sender: 'user' | 'owner' | 'admin';
  senderId: string;
  body: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportCase {
  _id: string;
  caseNumber: string;
  subject: string;
  category: SupportCaseCategory;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  userId: { _id: string; fullName?: string; email: string } | string;
  venueId?: string;
  reservationId?: string;
  assignedTo?: { _id: string; fullName?: string } | string;
  messages?: SupportMessage[];
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMyCases(): Promise<SupportCase[]> {
  const res = await apiFetch<SupportCase[]>('/support/cases');
  return res.data ?? [];
}

export async function fetchCaseDetail(id: string): Promise<SupportCase> {
  const res = await apiFetch<SupportCase>(`/support/cases/${id}`);
  return res.data;
}

export async function openSupportCase(payload: {
  subject: string;
  category?: SupportCaseCategory;
  body: string;
  venueId?: string;
  reservationId?: string;
}): Promise<SupportCase> {
  const res = await apiPostRaw<{ data: SupportCase }>('/support/cases', payload);
  return (res as any).data;
}

export async function replyToCase(id: string, body: string): Promise<SupportMessage> {
  const res = await apiPostRaw<{ data: SupportMessage }>(`/support/cases/${id}/messages`, { body });
  return (res as any).data;
}

export async function closeCase(id: string): Promise<void> {
  await apiPatchRaw(`/support/cases/${id}/close`, {});
}

export async function fetchAdminCases(params?: {
  page?: number;
  status?: string;
  category?: string;
  priority?: string;
}): Promise<{ data: SupportCase[]; meta: { total: number; page: number; pages: number; statusCounts: Record<string, number> } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  if (params?.priority) qs.set('priority', params.priority);
  const res = await apiFetch<SupportCase[]>(`/support/admin/cases?${qs}`);
  return {
    data: res.data ?? [],
    meta: (res.meta as any) ?? { total: 0, page: 1, pages: 1, statusCounts: {} },
  };
}

export async function adminUpdateCase(id: string, payload: { status?: SupportCaseStatus; priority?: SupportCasePriority; assignedTo?: string }): Promise<SupportCase> {
  const res = await apiPatchRaw<{ data: SupportCase }>(`/support/admin/cases/${id}`, payload);
  return (res as any).data;
}
