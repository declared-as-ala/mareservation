'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock3, Flag, ShieldAlert, XCircle } from 'lucide-react';
import { fetchAdminReviewQueue, moderateAdminReview } from '@/lib/api/admin-reviews';
import { cn } from '@/lib/utils';

type QueueStatus = 'pending' | 'flagged' | 'rejected' | 'approved';

const FILTERS: Array<{ key: QueueStatus; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'pending', label: 'En attente', icon: Clock3 },
  { key: 'flagged', label: 'Signalés', icon: Flag },
  { key: 'approved', label: 'Approuvés', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejetés', icon: XCircle },
];

export default function AdminModerationPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<QueueStatus>('pending');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-moderation-reviews', status],
    queryFn: () => fetchAdminReviewQueue(status),
  });

  const moderateMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'reset' }) =>
      moderateAdminReview(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-moderation-reviews'] });
      toast.success('Modération appliquée.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = data?.reviews ?? [];
  const counts = data?.counts ?? {};

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Centre de modération</h1>
            <p className="mt-1 text-sm text-zinc-400">Modérez avis, hôtels et événements depuis un seul espace.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/hotels-approval" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600">
              Approbation hôtels
            </Link>
            <Link href="/admin/events-moderation" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600">
              Modération événements
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = status === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                active
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              )}
            >
              <Icon className="size-3.5" />
              {f.label}
              <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-zinc-500">Chargement...</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
            Aucune entrée de modération.
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r._id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {r.venueId?.name ?? 'Lieu'} · {r.rating}/5
                  </p>
                  <p className="text-xs text-zinc-500">
                    {r.userId?.fullName ?? 'Client'} · {new Date(r.createdAt).toLocaleString('fr-TN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(r.flagCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300">
                      <ShieldAlert className="size-3" />
                      {r.flagCount} signalement(s)
                    </span>
                  )}
                  <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-400">{r.moderationStatus}</span>
                </div>
              </div>
              {r.title && <p className="mt-2 text-sm font-medium text-zinc-200">{r.title}</p>}
              <p className="mt-1 text-sm text-zinc-400">{r.comment}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moderateMut.mutate({ id: r._id, action: 'approve' })}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                >
                  Approuver
                </button>
                <button
                  type="button"
                  onClick={() => moderateMut.mutate({ id: r._id, action: 'reject' })}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300"
                >
                  Rejeter
                </button>
                <button
                  type="button"
                  onClick={() => moderateMut.mutate({ id: r._id, action: 'reset' })}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300"
                >
                  Réinitialiser flag
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

