import { api, apiGetRaw } from './client';

export type VenueApprovalStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'suspended';

export interface AdminHotel {
  _id: string;
  name: string;
  slug?: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  coverImage?: string;
  gallery?: string[];
  approvalStatus?: VenueApprovalStatus;
  isPublished?: boolean;
  isFeatured?: boolean;
  submittedForReviewAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNote?: string;
  description?: string;
  complianceDocs?: Array<{ url: string; label: string; uploadedAt: string }>;
  ownerId?: { _id: string; fullName?: string; email?: string; phone?: string; emailVerified?: boolean } | string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ChecklistResponse {
  venue: AdminHotel;
  checklist: ChecklistItem[];
  completion: { passed: number; total: number; percent: number };
}

export interface HotelsListResponse {
  hotels: AdminHotel[];
  counts: Record<string, number>;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: { _id: string; fullName?: string; email?: string } | string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data;
  return raw as T;
}

export async function fetchAdminHotels(params: { status?: string; q?: string } = {}): Promise<HotelsListResponse> {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  const url = `/admin-hotel/hotels${qs.toString() ? `?${qs}` : ''}`;
  const raw = await apiGetRaw<unknown>(url);
  return unwrap<HotelsListResponse>(raw) ?? { hotels: [], counts: {} };
}

export async function fetchHotelChecklist(id: string): Promise<ChecklistResponse> {
  const raw = await apiGetRaw<unknown>(`/admin-hotel/hotels/${id}/checklist`);
  return unwrap<ChecklistResponse>(raw);
}

export async function approveHotel(id: string): Promise<void> {
  await api.post(`/admin-hotel/hotels/${id}/approve`, {});
}
export async function rejectHotel(id: string, reason: string): Promise<void> {
  await api.post(`/admin-hotel/hotels/${id}/reject`, { reason });
}
export async function requestHotelChanges(id: string, note: string): Promise<void> {
  await api.post(`/admin-hotel/hotels/${id}/request-changes`, { note });
}
export async function suspendHotel(id: string, reason?: string): Promise<void> {
  await api.post(`/admin-hotel/hotels/${id}/suspend`, { reason });
}
export async function reinstateHotel(id: string): Promise<void> {
  await api.post(`/admin-hotel/hotels/${id}/reinstate`, {});
}
export async function featureHotel(id: string, featured: boolean): Promise<void> {
  await api.post(`/admin-hotel/hotels/${id}/feature`, { featured });
}

export async function fetchAuditLogs(params: { entityType?: string; entityId?: string; action?: string; limit?: number } = {}): Promise<AuditLogEntry[]> {
  const qs = new URLSearchParams();
  if (params.entityType) qs.set('entityType', params.entityType);
  if (params.entityId) qs.set('entityId', params.entityId);
  if (params.action) qs.set('action', params.action);
  if (params.limit) qs.set('limit', String(params.limit));
  const url = `/admin-hotel/audit-logs${qs.toString() ? `?${qs}` : ''}`;
  const raw = await apiGetRaw<unknown>(url);
  return unwrap<AuditLogEntry[]>(raw) ?? [];
}
