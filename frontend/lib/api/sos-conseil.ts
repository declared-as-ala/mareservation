import { apiFetch, apiGetRaw } from './client';
import type { SOSAssistantExtracted } from '@/lib/sos-conseil-mapper';

export type ContactPreferenceOpt = 'whatsapp' | 'phone' | 'email';

function normalizeExtracted(d: Partial<SOSAssistantExtracted> | undefined | null): SOSAssistantExtracted {
  return {
    fullName: d?.fullName ?? '',
    phone: d?.phone ?? '',
    email: d?.email ?? '',
    eventType: d?.eventType ?? '',
    participants: d?.participants ?? '',
    ageRanges: Array.isArray(d?.ageRanges) ? d.ageRanges.map(String) : [],
    region: d?.region ?? '',
    placeType: d?.placeType ?? '',
    date: d?.date ?? '',
    time: d?.time ?? '',
    budget: d?.budget ?? '',
    ambiance: Array.isArray(d?.ambiance) ? d.ambiance.map(String) : [],
    contactPreference: d?.contactPreference ?? '',
    details: d?.details ?? '',
  };
}

export interface SOSConseilPayload {
  fullName: string;
  phone: string;
  email?: string;
  occasionType: string;
  participantsCount: number;
  /** One or more age brackets (e.g. 20-30, 40-50). */
  averageAgeRanges: string[];
  preferredRegion: string;
  preferredCategory: string;
  budgetRange?: string;
  ambianceTags?: string[];
  contactPreference?: ContactPreferenceOpt;
  /** Résumé issu du flux assistant (admin) */
  aiAssistSummary?: string;
  preferredDate?: string;
  preferredTime?: string;
  details?: string;
}

export interface SOSConseilRecord extends SOSConseilPayload {
  _id: string;
  status: 'new' | 'in_review' | 'contacted' | 'closed';
  createdAt: string;
  updatedAt: string;
  /** Legacy API field from older backend rows */
  averageAgeRange?: string;
  /** Recommandations manuelles admin */
  adminRecommendedVenues?: string;
}

export interface SOSConseilListResponse {
  success: boolean;
  data: SOSConseilRecord[];
  total: number;
  page: number;
  pages: number;
}

/** Request / response aligned with POST /api/v1/sos-conseil/chat */
export interface SOSConseilChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SOSConseilChatPayload {
  messages: SOSConseilChatApiMessage[];
  currentFormData: Record<string, unknown>;
}

export interface SOSConseilChatSuccessData {
  assistantMessage: string;
  extractedData: Partial<SOSAssistantExtracted>;
  missingFields: string[];
  readyToSubmit: boolean;
  confidence: {
    fullName: number;
    phone: number;
    eventType: number;
    participants: number;
    region: number;
    placeType: number;
  };
}

export async function chatSOSConseil(payload: SOSConseilChatPayload): Promise<SOSConseilChatSuccessData & { extractedData: SOSAssistantExtracted }> {
  const res = await apiFetch<SOSConseilChatSuccessData>('/sos-conseil/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.success || res.data === undefined || res.data === null) {
    throw new Error(
      typeof res.errors === 'string'
        ? res.errors
        : (res.message as string) || 'Réponse IA invalide'
    );
  }

  const d = res.data as SOSConseilChatSuccessData;
  const extractedData = normalizeExtracted(d.extractedData);
  return { ...d, extractedData };
}

export async function submitSOSConseil(payload: SOSConseilPayload): Promise<{ success: boolean; data: SOSConseilRecord }> {
  const res = await apiFetch<SOSConseilRecord>('/sos-conseil', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { success: res.success, data: res.data };
}

export async function listSOSConseil(params?: { page?: number; status?: string }): Promise<SOSConseilListResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.append('page', String(params.page));
  if (params?.status) sp.append('status', params.status);
  const q = sp.toString();
  return apiGetRaw<SOSConseilListResponse>(`/sos-conseil${q ? `?${q}` : ''}`);
}

export async function updateSOSConseilStatus(id: string, status: SOSConseilRecord['status']): Promise<SOSConseilRecord> {
  const res = await apiFetch<SOSConseilRecord>(`/sos-conseil/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

/** Admin-only: mise à jour des recommandations manuelles (texte libre) */
export async function updateSOSConseilRecommendedVenues(
  id: string,
  adminRecommendedVenues: string
): Promise<SOSConseilRecord> {
  const res = await apiFetch<SOSConseilRecord>(`/sos-conseil/${id}/recommended-venues`, {
    method: 'PATCH',
    body: JSON.stringify({ adminRecommendedVenues }),
  });
  return res.data;
}

export async function deleteSOSConseil(id: string): Promise<void> {
  const res = await apiFetch(`/sos-conseil/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error('Erreur lors de la suppression');
}
