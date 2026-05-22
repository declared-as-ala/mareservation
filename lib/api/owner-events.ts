import { apiGetRaw, apiPatchRaw, apiPostRaw } from './client';

export type OwnerEventTicketType = {
  _id?: string;
  name: string;
  price: number;
  capacity: number;
  sold?: number;
  salesStartAt?: string;
  salesEndAt?: string;
  maxPerOrder?: number;
  isActive?: boolean;
};

export type OwnerEvent = {
  _id: string;
  venueId: string | { _id: string; name: string; city?: string };
  title: string;
  slug?: string;
  type: string;
  description?: string;
  coverImage?: string;
  galleryUrls?: string[];
  startAt: string;
  endsAt?: string;
  reservationMode?: 'ticket' | 'seat_zone' | 'seat' | 'table';
  ageRestriction?: string;
  termsFr?: string;
  approvalStatus: string;
  isPublished?: boolean;
  adminNote?: string;
  rejectionReason?: string;
  ticketTypes: OwnerEventTicketType[];
};

export async function fetchOwnerEvents(): Promise<OwnerEvent[]> {
  const res = await apiGetRaw<{ success?: boolean; data?: OwnerEvent[] } | OwnerEvent[]>('/owner-events');
  const data = Array.isArray(res) ? res : (res as { data?: OwnerEvent[] })?.data;
  return Array.isArray(data) ? data : [];
}

export async function createOwnerEvent(payload: {
  venueId: string;
  title: string;
  type: string;
  description?: string;
  coverImage?: string;
  galleryUrls?: string[];
  startAt: string;
  endsAt?: string;
  reservationMode?: 'ticket' | 'seat_zone' | 'seat' | 'table';
  ageRestriction?: string;
  termsFr?: string;
  ticketTypes: OwnerEventTicketType[];
}) {
  return apiPostRaw('/owner-events', payload);
}

export async function updateOwnerEvent(id: string, payload: Partial<{
  title: string;
  type: string;
  description: string;
  coverImage: string;
  galleryUrls: string[];
  startAt: string;
  endsAt: string;
  reservationMode: 'ticket' | 'seat_zone' | 'seat' | 'table';
  ageRestriction: string;
  termsFr: string;
  ticketTypes: OwnerEventTicketType[];
}>) {
  return apiPatchRaw(`/owner-events/${id}`, payload);
}

export async function submitOwnerEvent(id: string) {
  return apiPostRaw(`/owner-events/${id}/submit`, {});
}
