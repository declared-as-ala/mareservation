import { apiGetRaw, apiPatchRaw, apiPostRaw, apiDeleteRaw, api } from './client';

export interface AdminStats {
  totalUsers?: number;
  totalVenues?: number;
  totalReservations?: number;
  totalEvents?: number;
  confirmedReservations?: number;
  pendingReservations?: number;
  cancelledReservations?: number;
  reservationsToday?: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: AdminStats }>('/admin/dashboard/stats');
    const data = (res as { data?: AdminStats })?.data ?? res;
    return (data as AdminStats) ?? {};
  } catch {
    return {};
  }
}

export async function fetchAdminReservations(params?: { status?: string; page?: number }) {
  try {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    const qs = sp.toString();
    const res = await apiGetRaw<{ reservations?: unknown[] }>(`/admin/reservations${qs ? `?${qs}` : ''}`);
    const list = (res as { reservations?: unknown[] })?.reservations;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function forceCancelAdminReservation(id: string, reason: string) {
  return apiPatchRaw<{ success: boolean; message: string; data: unknown }>(`/admin/reservations/${id}/force-cancel`, { reason });
}

export async function markAdminReservationRefunded(id: string, reason: string) {
  return apiPatchRaw<{ success: boolean; message: string; data: unknown }>(`/admin/reservations/${id}/mark-refunded`, { reason });
}

export async function addAdminReservationNote(id: string, note: string) {
  return apiPostRaw<{ success: boolean; message: string; data: unknown }>(`/admin/reservations/${id}/note`, { note });
}

export async function fetchAdminVenues(params?: { page?: number; limit?: number; type?: string; city?: string; q?: string; ownerId?: string; withoutOwner?: boolean; archived?: 'only' | '1' }) {
  try {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.type) sp.set('type', params.type);
    if (params?.city) sp.set('city', params.city);
    if (params?.q) sp.set('q', params.q);
    if (params?.ownerId) sp.set('ownerId', params.ownerId);
    if (params?.withoutOwner) sp.set('withoutOwner', '1');
    if (params?.archived) sp.set('archived', params.archived);
    const qs = sp.toString();
    const res = await apiGetRaw<{ venues?: unknown[] }>(`/admin/venues${qs ? `?${qs}` : ''}`);
    const list = (res as { venues?: unknown[] })?.venues;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function fetchAdminVenuesTotalByType(type: string): Promise<number> {
  try {
    const sp = new URLSearchParams();
    sp.set('type', type);
    sp.set('page', '1');
    sp.set('limit', '1');
    const res = await apiGetRaw<{ total?: number }>(`/admin/venues?${sp.toString()}`);
    return Number((res as { total?: number })?.total ?? 0);
  } catch {
    return 0;
  }
}

export async function deleteAdminVenue(id: string) {
  return apiDeleteRaw<{ success: boolean; deleted: Record<string, number | string> }>(`/admin/venues/${id}`);
}

export async function archiveAdminVenue(id: string, reason?: string) {
  return apiPostRaw<{ success: boolean }>(`/admin/venues/${id}/archive`, { reason });
}

export async function restoreAdminVenue(id: string) {
  return apiPostRaw<{ success: boolean }>(`/admin/venues/${id}/restore`, {});
}

export type AdminOwner = { _id: string; fullName: string; email: string; role: string };

export async function fetchAdminOwners(): Promise<AdminOwner[]> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: AdminOwner[] }>('/admin/owners');
    const data = (res as { data?: AdminOwner[] })?.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function assignVenueOwner(venueId: string, ownerId: string | null) {
  return apiPatchRaw(`/admin/venues/${venueId}/owner`, { ownerId });
}

export type AdminVenuePayload = {
  name?: string;
  type?: string;
  city?: string;
  address?: string;
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  gallery?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  isVedette?: boolean;
  vedetteOrder?: number;
  bannerImage?: string | null;
  startingPrice?: number;
  phone?: string;
  slug?: string;
  immersiveType?: 'none' | 'virtual-tour' | 'view-360';
  immersiveSourceType?: 'url' | 'upload' | null;
  immersiveProvider?: 'custom' | 'matterport' | 'klapty';
  immersiveUrl?: string | null;
  immersiveFile?: string | null;
  immersiveMeta?: Record<string, unknown> | null;
};

export async function updateAdminVenue(id: string, payload: AdminVenuePayload) {
  return apiPatchRaw<{ _id: string }>(`/admin/venues/${id}`, payload);
}

export async function createAdminVenue(payload: AdminVenuePayload & { name: string; type: string; city: string; address: string }) {
  return apiPostRaw<{ _id: string }>('/admin/venues', payload);
}

export async function fetchAdminUsers(params?: { page?: number }) {
  try {
    const qs = params?.page ? `?page=${params.page}` : '';
    const res = await apiGetRaw<{ users?: unknown[] }>(`/admin/users${qs}`);
    const list = (res as { users?: unknown[] })?.users;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function fetchAdminEvents() {
  try {
    const data = await apiGetRaw<unknown[]>(`/admin/events`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAdminEventModeration(params?: { status?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('approvalStatus', params.status);
  if (params?.q) sp.set('q', params.q);
  const qs = sp.toString();
  const data = await apiGetRaw<unknown[]>(`/admin/events${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : [];
}

export async function approveAdminEvent(id: string) {
  return apiPatchRaw(`/admin/events/${id}/approve`, {});
}

export async function rejectAdminEvent(id: string, reason: string) {
  return apiPatchRaw(`/admin/events/${id}/reject`, { reason });
}

export async function requestAdminEventChanges(id: string, note: string) {
  return apiPatchRaw(`/admin/events/${id}/request-changes`, { note });
}

export async function inviteAdminOwner(payload: {
  fullName: string;
  email: string;
  phone?: string;
  role?: 'ESTABLISHMENT_OWNER' | 'ORGANIZER';
  serviceDomains?: string[];
}) {
  return apiPostRaw('/admin/owners/invite', payload);
}

export type AdminEventPayload = {
  venueId?: string;
  title?: string;
  type?: string;
  description?: string;
  startAt?: string;
  endsAt?: string;
  coverImage?: string;
  afficheImageUrl?: string;
  isPublished?: boolean;
  isVedette?: boolean;
};

export async function updateAdminEvent(id: string, payload: AdminEventPayload) {
  return apiPatchRaw<{ _id: string }>(`/admin/events/${id}`, payload);
}

export async function createAdminEvent(payload: AdminEventPayload & { venueId: string; title: string; startAt: string }) {
  return apiPostRaw<{ _id: string }>('/admin/events', payload);
}

// Virtual tours (admin)
export async function fetchAdminVirtualTours(venueId: string) {
  try {
    const data = await apiGetRaw<unknown[]>(`/admin/virtual-tours?venueId=${encodeURIComponent(venueId)}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export type AdminTablePlacement = {
  _id: string;
  venueId: string;
  tableId?: string;
  reservableUnitId?: string;
  virtualTourId?: string;
  sceneId: string;
  positionType: 'yaw_pitch' | 'matterport_anchor';
  floorIndex?: number;
  yaw?: number;
  pitch?: number;
  anchorPosition?: { x: number; y: number; z: number };
  stemVector?: { x: number; y: number; z: number };
  createdAt: string;
  updatedAt: string;
};

export async function fetchAdminTablePlacements(
  venueId: string,
  virtualTourId?: string,
  sceneId?: string
): Promise<AdminTablePlacement[]> {
  try {
    const sp = new URLSearchParams();
    sp.set('venueId', venueId);
    if (virtualTourId) sp.set('virtualTourId', virtualTourId);
    if (sceneId) sp.set('sceneId', sceneId);
    const qs = sp.toString();
    const res = await apiGetRaw<{ success?: boolean; data?: AdminTablePlacement[] } | AdminTablePlacement[]>(
      `/admin/table-placements?${qs}`
    );
    const data =
      Array.isArray(res) ? res : (res as { data?: AdminTablePlacement[] })?.data ?? (res as { placements?: AdminTablePlacement[] })?.placements;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createAdminTablePlacement(payload: {
  venueId: string;
  tableId?: string;
  reservableUnitId?: string;
  virtualTourId?: string;
  sceneId: string;
  positionType?: 'yaw_pitch' | 'matterport_anchor';
  yaw?: number;
  pitch?: number;
  anchorPosition?: { x: number; y: number; z: number };
  stemVector?: { x: number; y: number; z: number };
  floorIndex?: number;
}) {
  return apiPostRaw<{ success?: boolean; data?: AdminTablePlacement } | AdminTablePlacement>('/admin/table-placements', payload);
}

export async function updateAdminTablePlacement(
  id: string,
  payload: Partial<{
    sceneId: string;
    yaw: number;
    pitch: number;
    tableId: string;
    reservableUnitId: string;
    positionType: 'yaw_pitch' | 'matterport_anchor';
    anchorPosition: { x: number; y: number; z: number };
    stemVector: { x: number; y: number; z: number };
    floorIndex: number;
  }>
) {
  return apiPatchRaw<{ success?: boolean; data?: AdminTablePlacement } | AdminTablePlacement>(
    `/admin/table-placements/${id}`,
    payload
  );
}

export async function deleteAdminTablePlacement(id: string) {
  await api.delete(`/admin/table-placements/${id}`);
}

// Admin tables (per venue)
export type AdminTableRow = {
  _id: string;
  venueId: string;
  tableNumber: number;
  name?: string;
  code?: string;
  capacity: number;
  capacityMax?: number;
  locationLabel: string;
  price: number;
  minimumSpend?: number;
  defaultStatus: 'available' | 'reserved' | 'blocked';
  isVip: boolean;
  isActive: boolean;
};

export async function fetchAdminVenueTables(venueId: string): Promise<AdminTableRow[]> {
  try {
    const res = await apiGetRaw<{ data?: AdminTableRow[] }>(`/admin/venues/${venueId}/tables`);
    const data = (res as { data?: AdminTableRow[] })?.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createAdminTable(payload: {
  venueId: string;
  tableNumber: number;
  name?: string;
  code?: string;
  capacity: number;
  capacityMax?: number;
  locationLabel?: string;
  price?: number;
  minimumSpend?: number;
  defaultStatus?: 'available' | 'reserved' | 'blocked';
  isVip?: boolean;
  isActive?: boolean;
}) {
  return apiPostRaw<AdminTableRow>('/admin/tables', payload);
}

export async function updateAdminTable(id: string, payload: Partial<{ tableNumber: number; name: string; code: string; capacity: number; capacityMax: number; locationLabel: string; price: number; minimumSpend: number; defaultStatus: string; isVip: boolean; isActive: boolean }>) {
  return apiPatchRaw<AdminTableRow>(`/admin/tables/${id}`, payload);
}

export async function deleteAdminTable(id: string) {
  await api.delete(`/admin/tables/${id}`);
}

export async function fetchAdminReservableUnits(venueId: string): Promise<import('./owner-coworking').CoworkingUnit[]> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: import('./owner-coworking').CoworkingUnit[] }>(
      `/admin/reservable-units?venueId=${encodeURIComponent(venueId)}`
    );
    return (res as { data?: import('./owner-coworking').CoworkingUnit[] })?.data ?? [];
  } catch {
    return [];
  }
}

export interface AdminBannerSlide {
  _id: string;
  titleFr: string;
  subtitleFr?: string;
  ctaLabelFr?: string;
  ctaUrl?: string;
  imageUrlDesktop: string;
  imageUrlMobile?: string;
  sortOrder: number;
  isActive: boolean;
}

export async function fetchAdminBannerSlides(): Promise<AdminBannerSlide[]> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: AdminBannerSlide[] } | AdminBannerSlide[]>('/admin/banner-slides');
    const list = Array.isArray(res) ? res : (res as { data?: AdminBannerSlide[] })?.data ?? (res as { bannerSlides?: AdminBannerSlide[] })?.bannerSlides;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export type AdminBannerSlidePayload = {
  titleFr?: string;
  subtitleFr?: string;
  imageUrlDesktop?: string;
  imageUrlMobile?: string;
  ctaLabelFr?: string;
  ctaUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function createAdminBannerSlide(payload: AdminBannerSlidePayload & { titleFr: string; imageUrlDesktop: string }) {
  return api.post<{ data?: AdminBannerSlide }>('/admin/banner-slides', payload);
}

export async function updateAdminBannerSlide(id: string, payload: AdminBannerSlidePayload) {
  return apiPatchRaw<AdminBannerSlide>(`/admin/banner-slides/${id}`, payload);
}

export async function deleteAdminBannerSlide(id: string) {
  await api.delete(`/admin/banner-slides/${id}`);
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  type?: string;
  displayOrder?: number;
  icon?: string;
  description?: string;
}

export type AdminCategoryPayload = {
  name?: string;
  slug?: string;
  type?: string;
  displayOrder?: number;
  icon?: string;
  description?: string;
};

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: AdminCategory[] } | AdminCategory[]>('/admin/categories');
    const list = Array.isArray(res) ? res : (res as { data?: AdminCategory[] })?.data ?? (res as { categories?: AdminCategory[] })?.categories;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function createAdminCategory(payload: AdminCategoryPayload & { name: string; slug: string }) {
  return apiPostRaw<AdminCategory>('/admin/categories', payload);
}

export async function updateAdminCategory(id: string, payload: AdminCategoryPayload) {
  return apiPatchRaw<AdminCategory>(`/admin/categories/${id}`, payload);
}

export async function deleteAdminCategory(id: string) {
  await api.delete(`/admin/categories/${id}`);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  createdAt?: string;
  phone?: string;
  isActive?: boolean;
}

export async function updateAdminUser(id: string, payload: { role?: string; isActive?: boolean; fullName?: string }) {
  return apiPatchRaw<AdminUser>(`/admin/users/${id}`, payload);
}

export async function deleteAdminUser(id: string) {
  await api.delete(`/admin/users/${id}`);
}

// ─── Site Settings ────────────────────────────────────────────────────────────

export interface AdminSettings {
  siteName?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  supportPhone?: string;
  supportEmail?: string;
  defaultLanguage?: string;
  maintenanceMode?: boolean;
  homeSectionsOrder?: string[];
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: AdminSettings } | AdminSettings>('/admin/settings');
    const data = (res as { data?: AdminSettings })?.data ?? (res as AdminSettings);
    return (data as AdminSettings) ?? {};
  } catch {
    return {};
  }
}

export async function updateAdminSettings(payload: Partial<AdminSettings>): Promise<AdminSettings> {
  return apiPatchRaw<AdminSettings>('/admin/settings', payload);
}

// ═══════════════════════════════════════════════════════════════
// HOTEL ADMIN API
// ═══════════════════════════════════════════════════════════════

export interface AdminHotel {
  _id: string;
  name: string;
  slug: string;
  city: string;
  governorate?: string;
  address: string;
  phone?: string;
  coverImage?: string;
  gallery?: string[];
  description: string;
  shortDescription?: string;
  startingPrice?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  amenities?: string[];
  isPublished: boolean;
  isFeatured: boolean;
  hasVirtualTour?: boolean;
  checkInPolicy?: string;
  checkOutPolicy?: string;
  roomCount?: number;
  bookingCount?: number;
  createdAt?: string;
}

export interface AdminHotelRoom {
  _id: string;
  venueId: string;
  name?: string;
  roomNumber: number;
  roomType: string;
  capacity: number;
  capacityAdults?: number;
  capacityChildren?: number;
  bedType?: string;
  pricePerNight: number;
  surface?: number;
  description?: string;
  bathroomType?: string;
  amenities: string[];
  isActive: boolean;
  isReservable: boolean;
  isVip?: boolean;
  hasBalcony?: boolean;
  hasVirtualTour?: boolean;
  status?: 'available' | 'reserved' | 'blocked';
  coverImage?: string;
  gallery?: string[];
  /** Single panoramic 360° images (rotate-in-place, no inter-scene nav) */
  panoramicImages?: string[];
}

export interface AdminHotelBooking {
  _id: string;
  venueId: string;
  roomId?: { _id: string; name?: string; roomType: string; roomNumber: number; pricePerNight: number } | string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus?: string;
  totalPrice?: number;
  partySize?: number;
  confirmationCode?: string;
  createdAt?: string;
}

export interface AdminHotelScene {
  _id: string;
  venueId: string;
  name: string;
  description?: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
}

export interface AdminSceneHotspot {
  _id: string;
  venueId: string;
  virtualTourId: string;
  label: string;
  targetType: string;
  targetId: string;
  xPercent: number;
  yPercent: number;
  yaw?: number;
  pitch?: number;
  isActive: boolean;
}

export async function fetchAdminHotels(params?: { q?: string; city?: string; page?: number }): Promise<{ hotels: AdminHotel[]; total: number }> {
  try {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.city) sp.set('city', params.city);
    if (params?.page) sp.set('page', String(params.page));
    const qs = sp.toString();
    const res = await apiGetRaw<{ success?: boolean; hotels?: AdminHotel[]; total?: number }>(`/admin/hotels${qs ? `?${qs}` : ''}`);
    return { hotels: (res as any)?.hotels ?? [], total: (res as any)?.total ?? 0 };
  } catch {
    return { hotels: [], total: 0 };
  }
}

export async function fetchAdminHotelById(id: string): Promise<AdminHotel | null> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: AdminHotel }>(`/admin/hotels/${id}`);
    return (res as any)?.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchAdminHotelRooms(hotelId: string): Promise<AdminHotelRoom[]> {
  try {
    const res = await apiGetRaw<{ success?: boolean; rooms?: AdminHotelRoom[] }>(`/admin/hotels/${hotelId}/rooms`);
    return (res as any)?.rooms ?? [];
  } catch {
    return [];
  }
}

export async function createAdminHotelRoom(hotelId: string, payload: Partial<AdminHotelRoom>): Promise<AdminHotelRoom> {
  const res = await apiPostRaw<{ success?: boolean; data?: AdminHotelRoom }>(`/admin/hotels/${hotelId}/rooms`, payload);
  return (res as any)?.data ?? res;
}

export async function updateAdminHotelRoom(roomId: string, payload: Partial<AdminHotelRoom>): Promise<AdminHotelRoom> {
  const res = await apiPatchRaw<{ success?: boolean; data?: AdminHotelRoom }>(`/admin/rooms/${roomId}`, payload);
  return (res as any)?.data ?? res;
}

export async function deleteAdminHotelRoom(roomId: string): Promise<void> {
  await api.delete(`/admin/rooms/${roomId}`);
}

// ═══════════════════════════════════════════════════════════════
// ROOM-LEVEL SCENE API  (360° scenes scoped to a room/suite)
// ═══════════════════════════════════════════════════════════════

export async function fetchAdminRoomScenes(roomId: string): Promise<{ scenes: AdminHotelScene[]; hotspots: AdminSceneHotspot[] }> {
  try {
    const res = await apiGetRaw<{ success?: boolean; scenes?: AdminHotelScene[]; hotspots?: AdminSceneHotspot[] }>(`/admin/rooms/${roomId}/scenes`);
    return { scenes: (res as any)?.scenes ?? [], hotspots: (res as any)?.hotspots ?? [] };
  } catch {
    return { scenes: [], hotspots: [] };
  }
}

export async function createAdminRoomScene(roomId: string, payload: { name: string; image: string; description?: string }): Promise<AdminHotelScene> {
  const res = await apiPostRaw<{ success?: boolean; data?: AdminHotelScene }>(`/admin/rooms/${roomId}/scenes`, payload);
  return (res as any)?.data ?? res;
}

export const updateAdminRoomScene = updateAdminHotelScene;
export const deleteAdminRoomScene = deleteAdminHotelScene;

export async function fetchAdminHotelBookings(hotelId: string, params?: { status?: string; page?: number }): Promise<{ bookings: AdminHotelBooking[]; total: number }> {
  try {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    const qs = sp.toString();
    const res = await apiGetRaw<{ success?: boolean; bookings?: AdminHotelBooking[]; total?: number }>(`/admin/hotels/${hotelId}/bookings${qs ? `?${qs}` : ''}`);
    return { bookings: (res as any)?.bookings ?? [], total: (res as any)?.total ?? 0 };
  } catch {
    return { bookings: [], total: 0 };
  }
}

export async function fetchAdminHotelScenes(hotelId: string): Promise<{ scenes: AdminHotelScene[]; hotspots: AdminSceneHotspot[] }> {
  try {
    const res = await apiGetRaw<{ success?: boolean; scenes?: AdminHotelScene[]; hotspots?: AdminSceneHotspot[] }>(`/admin/hotels/${hotelId}/scenes`);
    return { scenes: (res as any)?.scenes ?? [], hotspots: (res as any)?.hotspots ?? [] };
  } catch {
    return { scenes: [], hotspots: [] };
  }
}

export async function createAdminHotelScene(hotelId: string, payload: { name: string; image: string; description?: string }): Promise<AdminHotelScene> {
  const res = await apiPostRaw<{ success?: boolean; data?: AdminHotelScene }>(`/admin/hotels/${hotelId}/scenes`, payload);
  return (res as any)?.data ?? res;
}

export async function updateAdminHotelScene(sceneId: string, payload: Partial<AdminHotelScene>): Promise<AdminHotelScene> {
  const res = await apiPatchRaw<{ success?: boolean; data?: AdminHotelScene }>(`/admin/scenes/${sceneId}`, payload);
  return (res as any)?.data ?? res;
}

export async function deleteAdminHotelScene(sceneId: string): Promise<void> {
  await api.delete(`/admin/scenes/${sceneId}`);
}

export async function createAdminSceneHotspot(payload: {
  venueId: string;
  sceneId: string;
  label: string;
  xPercent: number;
  yPercent: number;
  targetSceneId: string;
  yaw?: number;
  pitch?: number;
}): Promise<AdminSceneHotspot> {
  const res = await apiPostRaw<{ success?: boolean; data?: AdminSceneHotspot }>('/admin/scene-hotspots', payload);
  return (res as any)?.data ?? res;
}

export async function deleteAdminSceneHotspot(hotspotId: string): Promise<void> {
  await api.delete(`/admin/tour-hotspots/${hotspotId}`);
}

// ═══════════════════════════════════════════════════════════════
// VENUE SCENE API  (generic — works for all venue types)
// ═══════════════════════════════════════════════════════════════

export async function fetchAdminVenueScenes(venueId: string): Promise<{ scenes: AdminHotelScene[]; hotspots: AdminSceneHotspot[] }> {
  try {
    const res = await apiGetRaw<{ success?: boolean; scenes?: AdminHotelScene[]; hotspots?: AdminSceneHotspot[] }>(`/admin/venues/${venueId}/scenes`);
    return { scenes: (res as any)?.scenes ?? [], hotspots: (res as any)?.hotspots ?? [] };
  } catch {
    return { scenes: [], hotspots: [] };
  }
}

export async function createAdminVenueScene(venueId: string, payload: { name: string; image: string; description?: string }): Promise<AdminHotelScene> {
  const res = await apiPostRaw<{ success?: boolean; data?: AdminHotelScene }>(`/admin/venues/${venueId}/scenes`, payload);
  return (res as any)?.data ?? res;
}

export const updateAdminVenueScene = updateAdminHotelScene;
export const deleteAdminVenueScene = deleteAdminHotelScene;

// ─── Public categories (for explorer filter) ─────────────────────────────────

export interface PublicCategory {
  _id: string;
  name: string;
  slug: string;
  type?: string;
  icon?: string;
  displayOrder?: number;
}

export async function fetchPublicCategories(): Promise<PublicCategory[]> {
  try {
    const res = await apiGetRaw<{ success?: boolean; data?: PublicCategory[] } | PublicCategory[]>('/categories');
    const list = Array.isArray(res) ? res : (res as { data?: PublicCategory[] })?.data ?? (res as { categories?: PublicCategory[] })?.categories;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
