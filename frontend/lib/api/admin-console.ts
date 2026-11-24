/** Typed client for the redesigned super-admin (backend: /admin-console + /admin-bookings). */
import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from './client';
import { API_BASE } from './base-url';
import { useAuthStore } from '@/stores/auth';

type Envelope<T> = { success?: boolean; data: T };
const get = async <T>(path: string) => (await apiGetRaw<Envelope<T>>(path)).data;
const post = async <T>(path: string, body: unknown = {}) => (await apiPostRaw<Envelope<T>>(path, body)).data;
const patch = async <T>(path: string, body: unknown) => (await apiPatchRaw<Envelope<T>>(path, body)).data;

export const qs = (params: Record<string, string | number | boolean | null | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/* ── analytics ── */
export type Group = 'day' | 'week' | 'month';
export interface Analytics {
  period: { from: string; to: string; days: number; group: Group; timezone: string };
  previousPeriod: { from: string; to: string; days: number };
  includeDemo: boolean;
  excludedDemoReservations: number | null;
  kpis: {
    confirmedReservations: { value: number; previous: number; changePct: number | null };
    pendingReservations: { value: number; overdue: number; overdueWindowHours: number };
    bookingValue: { value: number; previous: number; changePct: number | null; currency: string };
    activeGuesthouses: { value: number; total: number };
    activeOwners: { value: number };
    occupancy: { rate: number | null; bookedNights: number; bookableNights: number; blockedNights: number; previousRate: number | null; changePts: number | null };
  };
  series: { date: string; confirmed: number; pending: number; cancelled: number; value: number; previousValue: number | null }[];
  statusBreakdown: { status: string; count: number }[];
  topProperties: { id: string; name: string; slug: string | null; city: string | null; bookings: number; value: number; occupancy: number | null }[];
  governorates: { name: string; bookings: number; value: number; properties: number }[];
  withoutGovernorate: number;
  insights: { averageBookingValue: number | null; averageStayNights: number | null; cancellationRate: number | null; averageLeadDays: number | null };
  operations: { pending: number; overdue: number; arrivalsToday: number; departuresToday: number; newApplications: number; failedEmails: number; notReady: { id: string; name: string; missing: string[] }[] };
  generatedAt: string;
}
export const fetchAnalytics = (p: { from?: string; to?: string; group?: Group; demo?: boolean }) =>
  get<Analytics>(`/admin-console/analytics${qs({ from: p.from, to: p.to, group: p.group, demo: p.demo ? '1' : undefined })}`);

/* ── reservations ── */
export interface ReservationRow {
  id: string;
  reference: string;
  guest: { name: string | null; email: string | null; phone: string | null; userId: string | null };
  property: { id: string; name: string; slug: string | null; city: string | null } | null;
  owner: { id: string; name: string; email: string } | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number | null;
  children: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  bookingMode: 'request' | 'instant' | null;
  unitScope: 'room' | 'entire' | null;
  isDemo: boolean;
  expiresAt: string | null;
  createdAt: string;
}
export interface Paged<T> { rows: T[]; total: number; page: number; pages: number; limit?: number }
export interface ReservationQuery {
  status?: string; venueId?: string; ownerId?: string; customerId?: string; q?: string; from?: string; to?: string;
  dateField?: 'created' | 'checkIn' | 'checkOut'; bookingMode?: string; sort?: string; page?: number; limit?: number; demo?: boolean;
}
const resQs = (q: ReservationQuery) => qs({ ...q, demo: q.demo ? '1' : undefined });
export const fetchReservations = (q: ReservationQuery) => get<Paged<ReservationRow>>(`/admin-console/reservations${resQs(q)}`);

/** CSV export with the user's bearer token, saved through a temporary object URL. */
export async function downloadReservationsCsv(q: ReservationQuery) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_BASE}/api/v1/admin-console/reservations${resQs({ ...q, page: undefined, limit: undefined })}${resQs(q) ? '&' : '?'}format=csv`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('Export impossible.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface ReservationDetail {
  _id: string;
  reservationCode?: string;
  status: string;
  paymentStatus?: string;
  startAt: string;
  endAt: string;
  nights?: number;
  adults?: number;
  children?: number;
  totalPrice?: number;
  unitScope?: string;
  bookingMode?: string;
  isDemo?: boolean;
  expiresAt?: string;
  specialRequest?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  priceBreakdown?: { subtotal?: number; cleaningFee?: number; serviceFee?: number; discount?: number; taxes?: number; total?: number; currency?: string };
  venueId?: { _id: string; name: string; slug?: string; ownerId?: string };
  statusHistory?: { from?: string; to: string; byUserId?: { fullName?: string; email?: string } | null; byRole?: string; reason?: string; at: string }[];
  emails?: { _id: string; event: string; recipientRole: string; status: string; attempts: number; lastError?: string; sentAt?: string; createdAt: string }[];
  createdAt: string;
}
export const fetchReservationDetail = (id: string) => get<ReservationDetail>(`/admin-bookings/reservations/${id}`);
export const transitionReservation = (id: string, to: 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show', reason?: string) =>
  post<{ id: string; status: string }>(`/admin-bookings/reservations/${id}/transition`, { to, reason });
export const retryEmail = (outboxId: string) => post(`/admin-bookings/email/outbox/${outboxId}/retry`);

/** Same state machine as the backend (bookingEngine.canTransition) — used only to show valid buttons. */
export const NEXT_STATES: Record<string, ('confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show')[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['cancelled', 'completed', 'no_show'],
  checked_in: ['completed'],
};

/* ── properties / guesthouses ── */
export interface PropertyRow {
  id: string; name: string; slug: string; type: string; city: string; governorate: string | null; coverImage: string | null;
  isDemo: boolean; isPublished: boolean; publicListed: boolean; approvalStatus: string; bookingEnabled: boolean | null;
  bookingMode: 'request' | 'instant'; rentalMode: 'rooms' | 'entire'; hasCoordinates: boolean; hasVirtualTour: boolean;
  owner: { id: string; fullName: string; email: string; isActive: boolean } | null; roomsCount: number; inventoryConfigured: boolean;
  bookable: boolean; bookingState: string;
}
export const fetchProperties = () => get<PropertyRow[]>('/admin-bookings/properties');
export const fetchPropertySettings = (id: string) => get<Record<string, any>>(`/admin-bookings/properties/${id}/settings`);
export const savePropertySettings = (id: string, body: Record<string, unknown>) => patch<Record<string, any>>(`/admin-bookings/properties/${id}/settings`, body);

/* ── owners ── */
export interface OwnerRow {
  id: string; fullName: string; email: string; phone: string | null; isActive: boolean; createdAt: string; lastLoginAt: string | null;
  properties: { id: string; name: string; slug: string; type: string }[];
}
export const fetchOwners = () => get<OwnerRow[]>('/admin-bookings/owners');
export const createOwner = (body: { fullName: string; email: string; phone?: string; venueIds?: string[]; sendInvite: boolean }) =>
  post<{ id: string; email: string; setupLink: string; setupLinkExpiresAt: string }>('/admin-bookings/owners', body);
export const setUserActive = (id: string, isActive: boolean) => patch(`/admin-bookings/users/${id}/status`, { isActive });
export const sendPasswordLink = (id: string, sendEmail = true) => post<{ setupLink: string; expiresAt: string }>(`/admin-bookings/users/${id}/password-link`, { sendEmail });

/* ── customers ── */
export interface CustomerRow {
  id: string; fullName: string; email: string; phone: string | null; isActive: boolean; emailVerified: boolean; createdAt: string;
  lastLoginAt: string | null; bookings: number; confirmedValue: number; lastBooking: string | null;
}
export const fetchCustomers = (q: { q?: string; status?: string; page?: number }) => get<Paged<CustomerRow>>(`/admin-console/customers${qs(q)}`);
export const fetchCustomer = (id: string) =>
  get<{ customer: { id: string; fullName: string; email: string; phone?: string; isActive?: boolean; emailVerified?: boolean; createdAt: string; lastLoginAt?: string }; reservations: ReservationRow[] }>(`/admin-console/customers/${id}`);

/* ── applications ── */
export interface ApplicationRow {
  id: string; establishmentName: string; contactName: string; email: string; phone: string; city: string; message: string | null;
  status: 'new' | 'in_review' | 'contacted' | 'closed'; decision: 'approved' | 'rejected' | null; decisionNote: string | null;
  decidedAt: string | null; decidedBy: { name: string; email: string } | null; owner: { id: string; name: string; email: string } | null;
  venue: { id: string; name: string; slug: string; approvalStatus: string } | null; adminNotes: string | null; createdAt: string; updatedAt: string;
}
export const fetchApplications = (status?: string) => get<{ rows: ApplicationRow[]; counts: Record<string, number> }>(`/admin-console/applications${qs({ status })}`);
export const updateApplication = (id: string, body: { status?: string; adminNotes?: string }) => patch(`/admin-console/applications/${id}`, body);
export const approveApplication = (id: string, body: { ownerFullName: string; ownerEmail: string; ownerPhone?: string; venueName: string; city?: string; governorate?: string; sendInvite: boolean; note?: string }) =>
  post<{ venueId: string; ownerId: string; setupLink: string | null }>(`/admin-console/applications/${id}/approve`, body);
export const rejectApplication = (id: string, note?: string) => post(`/admin-console/applications/${id}/reject`, { note });

/* ── e-mail / SMTP ── */
export interface EmailStatus {
  configured?: boolean; host?: string | null; port?: number | null; secure?: boolean; from?: string | null; verified?: boolean | null; error?: string | null;
  outbox: { queued: number; failed: number; sent24h: number };
  [k: string]: unknown;
}
export const fetchEmailStatus = (verify = false) => get<EmailStatus>(`/admin-bookings/email/status${verify ? '?verify=1' : ''}`);
export const sendTestEmail = (to: string) => post<{ status: string; messageId: string | null; error: string | null; sentAt: string | null }>('/admin-bookings/email/test', { to });
export const fetchOutbox = (status?: string) =>
  get<{ _id: string; event: string; to: string; recipientRole: string; subject: string; status: string; attempts: number; lastError?: string; sentAt?: string; createdAt: string }[]>(`/admin-bookings/email/outbox${qs({ status, limit: 50 })}`);

/* ── guesthouses ── */
export interface GuesthouseRow {
  id: string; name: string; slug: string; city: string; governorate: string | null; coverImage: string | null; photos: number;
  isDemo: boolean; publicState: 'published' | 'draft' | 'pending_review' | 'suspended'; approvalStatus: string; isPublished: boolean;
  bookingEnabled: boolean | null; bookingMode: 'request' | 'instant'; rentalMode: 'rooms' | 'entire'; rooms: number;
  basePrice: number | null; capacity: number | null; owner: { id: string; name: string; email: string; isActive: boolean } | null;
  reservations: number; pendingReservations: number; tour: 'external' | 'scenes' | 'none'; sceneCount: number; missing: string[];
  updatedAt: string; createdAt: string;
}
export const fetchGuesthouses = () => get<GuesthouseRow[]>('/admin-console/guesthouses');
export const createGuesthouse = (body: { name: string; city: string; governorate?: string; ownerId?: string; rentalMode: 'entire' | 'rooms' }) =>
  post<{ id: string; slug: string }>('/admin-console/guesthouses', body);

/* ── rooms (owner endpoints accept ADMIN for any property) ── */
export interface RoomRow { _id: string; name?: string; roomNumber: number; roomType: string; capacity: number; pricePerNight: number; isActive?: boolean; isReservable?: boolean; minimumNights?: number }
export const createRoom = (venueId: string, body: Partial<RoomRow>) => apiPostRaw(`/owner/hotels/${venueId}/rooms`, body);
export const updateRoom = (roomId: string, body: Partial<RoomRow>) => apiPatchRaw(`/owner/rooms/${roomId}`, body);
export const deleteRoom = (roomId: string) => apiDeleteRaw(`/owner/rooms/${roomId}`);

/**
 * Image upload with progress (XHR) to the existing storage (/uploads/image → Cloudinary).
 * Large photos are downscaled client-side first (max 2560 px, JPEG q=0.86) — 360° panoramas are never resized.
 */
export async function uploadImageWithProgress(file: File, onProgress: (pct: number) => void, opts: { resize?: boolean } = { resize: true }): Promise<string> {
  const body = new FormData();
  body.append('file', opts.resize === false ? file : await downscale(file));
  const token = useAuthStore.getState().accessToken;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/v1/uploads/image`);
    xhr.withCredentials = true;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let json: { data?: { url?: string }; message?: string; error?: string } = {};
      try { json = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && json.data?.url) resolve(json.data.url);
      else reject(new Error(json.message || json.error || `Échec de l’envoi (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi.'));
    xhr.send(body);
  });
}

async function downscale(file: File, max = 2560): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 2_500_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/* ── owners (augmented) ── */
export interface OwnerConsoleRow {
  id: string; fullName: string; email: string; phone: string | null; isActive: boolean; createdAt: string; lastLoginAt: string | null;
  onboarding: 'invited' | 'no_property' | 'setup' | 'active';
  properties: { id: string; name: string; slug: string; isDemo: boolean; published: boolean }[];
  reservations: { active: number; pending: number; total: number };
}
export const fetchOwnersConsole = () => get<OwnerConsoleRow[]>('/admin-console/owners');

/* ── config / settings ── */
export interface BookingConfig { timezone: string; requestTtlHours: number; requestTtlSource: 'env' | 'default'; referenceExample: string; demoReferenceExample: string; defaultBookingMode: string; cancellationPolicies: string[] }
export const fetchBookingConfig = () => get<BookingConfig>('/admin-console/config');
export interface SiteSettings { siteName?: string; supportEmail?: string; supportPhone?: string; defaultLanguage?: string; logoUrlLight?: string; logoUrlDark?: string; isMaintenanceMode?: boolean; maintenanceMessageFr?: string }
export const fetchSiteSettings = async () => ((await apiGetRaw<{ data?: SiteSettings }>('/admin/settings')).data ?? {}) as SiteSettings;
export const saveSiteSettings = (body: SiteSettings) => apiPatchRaw('/admin/settings', body);
