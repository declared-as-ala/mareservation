'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchAdminCases,
  fetchCaseDetail,
  replyToCase,
  adminUpdateCase,
  type SupportCase,
  type SupportCaseStatus,
  type SupportCasePriority,
} from '@/lib/api/support';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: 'Ouvert',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',       icon: Clock },
  in_progress: { label: 'En cours', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',          icon: MessageCircle },
  resolved:    { label: 'Résolu',   color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  closed:      { label: 'Fermé',    color: 'text-zinc-500 bg-zinc-700/20 border-zinc-700/30',          icon: X },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Faible',   color: 'text-zinc-400' },
  normal: { label: 'Normal',   color: 'text-blue-400' },
  high:   { label: 'Haute',    color: 'text-orange-400' },
  urgent: { label: 'Urgent',   color: 'text-red-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ── Case detail panel ── */
function CasePanel({ caseId, onClose, onUpdated }: { caseId: string; onClose: () => void; onUpdated: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState<SupportCaseStatus | ''>('');
  const [priority, setPriority] = useState<SupportCasePriority | ''>('');

  const { data: c, isLoading } = useQuery({
    queryKey: ['admin-support-case', caseId],
    queryFn: () => fetchCaseDetail(caseId),
  });

  const replyMut = useMutation({
    mutationFn: () => replyToCase(caseId, reply),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin-support-case', caseId] });
      onUpdated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => adminUpdateCase(caseId, {
      status: status || undefined,
      priority: priority || undefined,
    }),
    onSuccess: () => {
      toast.success('Dossier mis à jour.');
      qc.invalidateQueries({ queryKey: ['admin-support-case', caseId] });
      onUpdated();
      setStatus('');
      setPriority('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="flex w-full max-w-xl flex-col gap-4 rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 sm:max-h-[85vh] sm:rounded-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
        ) : c ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{c.subject}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  #{c.caseNumber} · {typeof c.userId === 'object' ? `${c.userId.fullName ?? ''} ${c.userId.email}` : '—'}
                </p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
            </div>

            {/* Status & priority controls */}
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SupportCaseStatus | '')}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="">Changer statut…</option>
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportCasePriority | '')}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="">Priorité…</option>
                {['low', 'normal', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p]?.label ?? p}</option>
                ))}
              </select>
              {(status || priority) && (
                <button
                  onClick={() => updateMut.mutate()}
                  disabled={updateMut.isPending}
                  className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/30"
                >
                  Appliquer
                </button>
              )}
              <StatusBadge status={c.status} />
            </div>

            {/* Thread */}
            <div className="space-y-3">
              {(c.messages ?? []).map((m, i) => {
                const isSupport = m.sender === 'admin';
                return (
                  <div key={i} className={cn('flex gap-3', isSupport ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn('h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold',
                      isSupport ? 'bg-amber-400/20 text-amber-400' : 'bg-zinc-800 text-zinc-300')}>
                      {isSupport ? 'S' : 'U'}
                    </div>
                    <div className={cn('max-w-[80%] rounded-xl px-3 py-2',
                      isSupport ? 'bg-amber-400/5 border border-amber-400/10' : 'bg-zinc-900 border border-zinc-800')}>
                      <p className="text-sm text-zinc-100 whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-[10px] text-zinc-600">{fmtDate(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            {!['resolved', 'closed'].includes(c.status) && (
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Répondre au client…"
                  className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                />
                <button
                  disabled={!reply.trim() || replyMut.isPending}
                  onClick={() => replyMut.mutate()}
                  className="flex-shrink-0 rounded-lg bg-amber-500/20 px-3 text-amber-400 hover:bg-amber-500/30 disabled:opacity-40"
                >
                  {replyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ── Main Page ── */
const STATUS_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'closed', label: 'Fermés' },
];

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-cases', statusFilter],
    queryFn: () => fetchAdminCases({ status: statusFilter || undefined }),
  });

  const cases = data?.data ?? [];
  const counts = data?.meta.statusCounts ?? {};

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Support client</h1>
        <p className="mt-1 text-sm text-zinc-400">Gérez les demandes d&apos;assistance des utilisateurs.</p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'open', label: 'Ouverts', color: 'text-amber-400' },
          { key: 'in_progress', label: 'En cours', color: 'text-blue-400' },
          { key: 'resolved', label: 'Résolus', color: 'text-emerald-400' },
        ].map(({ key, label, color }) => (
          <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <p className={cn('text-xl font-bold', color)}>{counts[key] ?? 0}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              statusFilter === f.key
                ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
      ) : cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">Aucun dossier.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                {['#', 'Sujet', 'Client', 'Catégorie', 'Priorité', 'Statut', 'Date', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {cases.map((c) => {
                const user = typeof c.userId === 'object' ? c.userId : null;
                const priCfg = PRIORITY_CONFIG[c.priority] ?? PRIORITY_CONFIG.normal;
                return (
                  <tr key={c._id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{c.caseNumber}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-zinc-100">{c.subject}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{user?.fullName ?? user?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 capitalize">{c.category}</td>
                    <td className={cn('px-4 py-3 text-xs font-medium', priCfg.color)}>{priCfg.label}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(c._id)}
                        className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <CasePanel
          caseId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-support-cases'] })}
        />
      )}
    </div>
  );
}
