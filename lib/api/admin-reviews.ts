import { apiGetRaw, apiPostRaw } from './client';

export type AdminReviewQueueItem = {
  _id: string;
  rating: number;
  title?: string;
  comment: string;
  helpfulCount?: number;
  flagCount?: number;
  moderationStatus: 'pending' | 'flagged' | 'rejected' | 'approved';
  moderationReason?: string | null;
  createdAt: string;
  userId?: { _id?: string; fullName?: string; email?: string } | null;
  venueId?: { _id?: string; name?: string; slug?: string; city?: string } | null;
};

export type AdminReviewQueueResponse = {
  reviews: AdminReviewQueueItem[];
  counts: Record<string, number>;
};

export async function fetchAdminReviewQueue(status?: 'pending' | 'flagged' | 'rejected' | 'approved'): Promise<AdminReviewQueueResponse> {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  const raw = await apiGetRaw<{ success?: boolean; data?: AdminReviewQueueResponse } | AdminReviewQueueResponse>(`/reviews/admin/queue?${qs.toString()}`);
  const data = (raw as { data?: AdminReviewQueueResponse })?.data ?? (raw as AdminReviewQueueResponse);
  return {
    reviews: Array.isArray(data?.reviews) ? data.reviews : [],
    counts: data?.counts ?? {},
  };
}

export async function moderateAdminReview(id: string, action: 'approve' | 'reject' | 'reset', reason?: string): Promise<void> {
  await apiPostRaw(`/reviews/admin/${id}/moderate`, { action, reason });
}

