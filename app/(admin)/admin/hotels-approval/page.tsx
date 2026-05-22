'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  FileText,
  Hotel,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Pause,
  Phone,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchAdminHotels,
  fetchHotelChecklist,
  fetchAuditLogs,
  approveHotel,
  rejectHotel,
  requestHotelChanges,
  suspendHotel,
  reinstateHotel,
  featureHotel,
  type AdminHotel,
  type VenueApprovalStatus,
  type ChecklistItem,
  type AuditLogEntry,
} from '@/lib/api/admin-hotel';

const STATUS_META: Record<string, { label: string; tone: 'amber' | 'emerald' | 'red' | 'neutral' | 'blue' }> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  pending_review: { label: 'En attente', tone: 'amber' },
  changes_requested: { label: 'Changements demandés', tone: 'blue' },
  approved: { label: 'Approuvé', tone: 'emerald' },
  rejected: { label: 'Rejeté', tone: 'red' },
  suspended: { label: 'Suspendu', tone: 'red' },
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'pending_review', label: 'En attente' },
  { value: 'changes_requested', label: 'Changements' },
  { value: 'approved', label: 'Approuvés' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'suspended', label: 'Suspendus' },
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getOwner(h: AdminHotel) {
  return typeof h.ownerId === 'object' ? h.ownerId : null;
}

export default function HotelsApprovalPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending_review');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-hotels', status, q],
    queryFn: () => fetchAdminHotels({ status, q: q || undefined }),
  });

  const hotels = data?.hotels ?? [];
  const counts = data?.counts ?? {};

  // Auto-select first hotel
  useEffect(() => {
    if (hotels.length && !selectedId) setSelectedId(hotels[0]._id);
    if (selectedId && !hotels.find((h) => h._id === selectedId)) {
      setSelectedId(hotels[0]?._id ?? null);
    }
  }, [hotels, selectedId]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-hotels'] });
    qc.invalidateQueries({ queryKey: ['hotel-checklist'] });
    qc.invalidateQueries({ queryKey: ['admin-audit-logs'] });
  }

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      <header className="border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-4 lg:px-6 py-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Marketplace</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">Approbation des hôtels</h1>
          </div>
          <CountChip label="En attente" count={counts.pending_review ?? 0} tone="amber" />
          <CountChip label="Changements" count={counts.changes_requested ?? 0} tone="blue" />
          <CountChip label="Actifs" count={counts.approved ?? 0} tone="emerald" />
          <CountChip label="Rejetés" count={(counts.rejected ?? 0) + (counts.suspended ?? 0)} tone="red" />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs font-medium text-neutral-300 hover:text-white hover:border-white/20 transition disabled:opacity-40"
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Rafraîchir
          </button>
        </div>

        <div className="px-4 lg:px-6 pb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-600" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un hôtel ou une ville…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 h-9 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={cn(
                  'shrink-0 rounded-full border px-3 h-9 text-xs font-medium transition',
                  status === f.value
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                    : 'border-white/[0.08] bg-white/[0.02] text-neutral-500 hover:border-white/15 hover:text-neutral-300'
                )}
              >
                {f.label}
                {counts[f.value] ? <span className="ml-1.5 text-[10px] opacity-70">{counts[f.value]}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-6 py-5 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* Queue */}
        <aside className="space-y-2">
          {isLoading ? (
            <Loader2 className="size-6 text-neutral-600 animate-spin mx-auto mt-12" />
          ) : hotels.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-neutral-500">
              <Hotel className="size-10 text-neutral-700 mx-auto mb-2" />
              Aucun hôtel ne correspond.
            </div>
          ) : (
            hotels.map((h) => (
              <HotelQueueCard
                key={h._id}
                hotel={h}
                active={h._id === selectedId}
                onClick={() => setSelectedId(h._id)}
              />
            ))
          )}
        </aside>

        {/* Detail panel */}
        <section className="min-w-0">
          {selectedId ? (
            <HotelDetailPanel hotelId={selectedId} onMutated={refresh} />
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center text-sm text-neutral-500">
              <ShieldCheck className="size-12 text-neutral-700 mx-auto mb-3" />
              Sélectionnez un hôtel pour démarrer l'examen.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─── queue card ─────────────────────────────────────────────────── */

function HotelQueueCard({ hotel, active, onClick }: { hotel: AdminHotel; active: boolean; onClick: () => void }) {
  const meta = STATUS_META[hotel.approvalStatus ?? 'approved'] ?? { label: hotel.approvalStatus ?? '?', tone: 'neutral' as const };
  const owner = getOwner(hotel);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border p-3 transition-all',
        active
          ? 'border-amber-400/40 bg-amber-400/[0.06] shadow-lg shadow-amber-400/5'
          : 'border-white/[0.07] bg-[#0C0C0C] hover:border-white/15'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-900">
          {hotel.coverImage ? (
            <Image src={hotel.coverImage} alt={hotel.name} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="grid place-items-center h-full text-neutral-700">
              <Hotel className="size-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-neutral-100 truncate">{hotel.name}</h3>
            {hotel.isFeatured && <Crown className="size-3 text-amber-400 shrink-0" />}
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-500 truncate flex items-center gap-1">
            <MapPin className="size-3" /> {hotel.city}
          </p>
          {owner && (
            <p className="mt-0.5 text-[10px] text-neutral-600 truncate">{owner.fullName ?? owner.email}</p>
          )}
          <div className="mt-1.5">
            <StatusBadge meta={meta} small />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── detail panel ──────────────────────────────────────────────── */

function HotelDetailPanel({ hotelId, onMutated }: { hotelId: string; onMutated: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['hotel-checklist', hotelId],
    queryFn: () => fetchHotelChecklist(hotelId),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs', hotelId],
    queryFn: () => fetchAuditLogs({ entityType: 'venue', entityId: hotelId, limit: 50 }),
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] p-12 text-center">
        <Loader2 className="size-6 text-neutral-600 animate-spin mx-auto" />
      </div>
    );
  }

  const { venue, checklist, completion } = data;
  const status = venue.approvalStatus ?? 'approved';
  const meta = STATUS_META[status];
  const owner = getOwner(venue);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
        <div className="relative aspect-[16/6] bg-neutral-950">
          {venue.coverImage ? (
            <Image src={venue.coverImage} alt={venue.name} fill className="object-cover" sizes="1000px" priority />
          ) : (
            <div className="grid place-items-center h-full text-neutral-700">
              <Hotel className="size-14" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge meta={meta} />
              {venue.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  <Crown className="size-3" /> Mis en avant
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] text-neutral-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest">
                {venue.isPublished ? <Eye className="size-3" /> : <Pause className="size-3" />}
                {venue.isPublished ? 'Visible' : 'Masqué'}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">{venue.name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-300">
              <MapPin className="size-3" />
              {[venue.address, venue.city].filter(Boolean).join(', ')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.06] border-t border-white/[0.06]">
          <Stat label="Soumis le" value={fmtDate(venue.submittedForReviewAt)} />
          <Stat label="Examiné le" value={fmtDate(venue.reviewedAt)} />
          <Stat label="Téléphone" value={venue.phone ?? '—'} mono />
          <Stat label="Email hôtel" value={venue.email ?? '—'} mono />
        </div>

        {(owner || venue.adminNote || venue.rejectionReason) && (
          <div className="border-t border-white/[0.06] p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {owner && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold mb-1">Propriétaire</p>
                <p className="text-sm font-semibold text-neutral-200">{owner.fullName ?? '—'}</p>
                <a href={`mailto:${owner.email}`} className="block text-xs text-amber-400 hover:underline">
                  {owner.email}
                </a>
                {owner.phone && <p className="text-xs text-neutral-500 mt-0.5">{owner.phone}</p>}
                {owner.emailVerified === false && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-300">
                    <AlertTriangle className="size-3" /> Email non vérifié
                  </p>
                )}
              </div>
            )}
            {venue.rejectionReason && (
              <div className="rounded-xl bg-red-500/[0.05] border border-red-500/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-red-300 font-bold mb-1">Motif de rejet</p>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{venue.rejectionReason}</p>
              </div>
            )}
            {venue.adminNote && !venue.rejectionReason && (
              <div className="rounded-xl bg-blue-500/[0.05] border border-blue-500/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-blue-300 font-bold mb-1">Note pour l'hôtelier</p>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{venue.adminNote}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <ActionsRow
        venue={venue}
        onDone={onMutated}
        canApprove={completion.passed === completion.total}
      />

      {/* Checklist */}
      <ChecklistPanel checklist={checklist} completion={completion} />

      {/* Description / docs */}
      {venue.description && (
        <Section title="Description">
          <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 max-h-48 overflow-y-auto">
            {venue.description}
          </p>
        </Section>
      )}

      {venue.complianceDocs && venue.complianceDocs.length > 0 && (
        <Section title="Documents administratifs">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {venue.complianceDocs.map((doc, i) => (
              <li key={i}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition p-3"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 text-amber-400 shrink-0" />
                    <span className="text-sm text-neutral-200 truncate">{doc.label}</span>
                  </span>
                  <ExternalLink className="size-3.5 text-neutral-500 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Audit log */}
      <Section title={`Audit log (${auditLogs.length})`}>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-neutral-600 italic px-1">Aucun événement enregistré.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
            {auditLogs.slice(0, 20).map((entry) => (
              <AuditEntry key={entry._id} entry={entry} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ─── actions ────────────────────────────────────────────────────── */

function ActionsRow({ venue, onDone, canApprove }: { venue: AdminHotel; onDone: () => void; canApprove: boolean }) {
  const status = venue.approvalStatus ?? 'approved';

  const mutate = useMutation({
    mutationFn: async (op: { kind: 'approve' | 'reject' | 'request_changes' | 'suspend' | 'reinstate' | 'feature' | 'unfeature'; payload?: string }) => {
      switch (op.kind) {
        case 'approve': return approveHotel(venue._id);
        case 'reject': return rejectHotel(venue._id, op.payload!);
        case 'request_changes': return requestHotelChanges(venue._id, op.payload!);
        case 'suspend': return suspendHotel(venue._id, op.payload);
        case 'reinstate': return reinstateHotel(venue._id);
        case 'feature': return featureHotel(venue._id, true);
        case 'unfeature': return featureHotel(venue._id, false);
      }
    },
    onSuccess: (_, v) => {
      toast.success(
        v.kind === 'approve' ? 'Hôtel approuvé' :
        v.kind === 'reject' ? 'Hôtel rejeté' :
        v.kind === 'request_changes' ? 'Demande envoyée' :
        v.kind === 'suspend' ? 'Hôtel suspendu' :
        v.kind === 'reinstate' ? 'Hôtel réactivé' :
        v.kind === 'feature' ? 'Mis en avant' :
        'Retiré du Vedette'
      );
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  function doApprove() {
    if (!confirm('Approuver et publier cet hôtel ?')) return;
    mutate.mutate({ kind: 'approve' });
  }
  function doReject() {
    const reason = window.prompt('Motif du rejet (requis)') ?? '';
    if (!reason.trim()) return toast.error('Motif requis.');
    mutate.mutate({ kind: 'reject', payload: reason.trim() });
  }
  function doRequestChanges() {
    const note = window.prompt('Note à transmettre au propriétaire (requis)') ?? '';
    if (!note.trim()) return toast.error('Note requise.');
    mutate.mutate({ kind: 'request_changes', payload: note.trim() });
  }
  function doSuspend() {
    if (!confirm('Suspendre cet hôtel ? Il deviendra invisible publiquement.')) return;
    const reason = (window.prompt('Motif de suspension (requis)') ?? '').trim();
    if (!reason) return toast.error('Motif requis.');
    mutate.mutate({ kind: 'suspend', payload: reason });
  }
  function doReinstate() {
    if (!confirm('Réactiver cet hôtel ?')) return;
    mutate.mutate({ kind: 'reinstate' });
  }
  function doFeature(featured: boolean) {
    mutate.mutate({ kind: featured ? 'feature' : 'unfeature' });
  }

  const isPendingState = ['pending_review', 'changes_requested', 'draft'].includes(status);
  const isLive = status === 'approved';
  const isOff = ['rejected', 'suspended'].includes(status);
  const busy = mutate.isPending;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] p-4 flex flex-wrap gap-2">
      {isPendingState && (
        <>
          <PrimaryAction
            icon={CheckCircle2}
            label={canApprove ? 'Approuver' : 'Checklist incomplet'}
            tone="emerald"
            onClick={doApprove}
            disabled={busy || !canApprove}
          />
          <PrimaryAction icon={Send} label="Demander des changements" tone="blue" onClick={doRequestChanges} disabled={busy} />
          <PrimaryAction icon={XCircle} label="Rejeter" tone="red" onClick={doReject} disabled={busy} />
        </>
      )}
      {isLive && (
        <>
          <PrimaryAction
            icon={Crown}
            label={venue.isFeatured ? 'Retirer du Vedette' : 'Mettre en avant'}
            tone={venue.isFeatured ? 'neutral' : 'amber'}
            onClick={() => doFeature(!venue.isFeatured)}
            disabled={busy}
          />
          <PrimaryAction icon={Pause} label="Suspendre" tone="red" ghost onClick={doSuspend} disabled={busy} />
        </>
      )}
      {isOff && (
        <PrimaryAction icon={Play} label="Réactiver" tone="emerald" onClick={doReinstate} disabled={busy} />
      )}
      <Link
        href={`/admin/hotels/${venue._id}`}
        className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-10 text-sm font-medium text-neutral-300 hover:text-white hover:border-white/20 transition"
      >
        <Eye className="size-4" />
        Éditer la fiche
      </Link>
      {venue.slug && (
        <a
          href={`/hotel/${venue.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-10 text-sm font-medium text-neutral-300 hover:text-white hover:border-white/20 transition"
        >
          <ExternalLink className="size-4" />
          Voir page publique
        </a>
      )}
    </div>
  );
}

function PrimaryAction({
  icon: Icon, label, tone, onClick, disabled, ghost,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: 'emerald' | 'amber' | 'red' | 'blue' | 'neutral';
  onClick: () => void;
  disabled?: boolean;
  ghost?: boolean;
}) {
  const filled = {
    emerald: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    amber: 'bg-amber-400 hover:bg-amber-300 text-black',
    red: 'bg-red-500 hover:bg-red-400 text-white',
    blue: 'bg-blue-500 hover:bg-blue-400 text-white',
    neutral: 'bg-white/[0.08] hover:bg-white/[0.12] text-neutral-200',
  }[tone];
  const ghostCls = {
    emerald: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
    amber: 'border-amber-400/30 text-amber-300 hover:bg-amber-400/10',
    red: 'border-red-500/30 text-red-300 hover:bg-red-500/10',
    blue: 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10',
    neutral: 'border-white/[0.08] text-neutral-300 hover:bg-white/[0.04]',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-4 h-10 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed',
        ghost ? `border ${ghostCls}` : `${filled} shadow-lg`
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

/* ─── checklist ─────────────────────────────────────────────────── */

function ChecklistPanel({ checklist, completion }: { checklist: ChecklistItem[]; completion: { passed: number; total: number; percent: number } }) {
  return (
    <Section
      title="Checklist d'approbation"
      headerRight={
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                completion.percent === 100 ? 'bg-emerald-400' : completion.percent >= 70 ? 'bg-amber-400' : 'bg-red-400'
              )}
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-neutral-300">
            {completion.passed} / {completion.total}
          </span>
        </div>
      }
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {checklist.map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 transition',
              item.passed
                ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                : 'border-red-500/20 bg-red-500/[0.04]'
            )}
          >
            <span
              className={cn(
                'mt-0.5 inline-flex size-5 items-center justify-center rounded-md shrink-0',
                item.passed ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
              )}
            >
              {item.passed ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-200">{item.label}</p>
              {item.detail && <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ─── audit log entry ───────────────────────────────────────────── */

const ACTION_LABELS: Record<string, { label: string; tone: 'amber' | 'emerald' | 'red' | 'blue' | 'neutral' }> = {
  VENUE_APPROVED: { label: 'Approuvé', tone: 'emerald' },
  VENUE_REJECTED: { label: 'Rejeté', tone: 'red' },
  VENUE_CHANGES_REQUESTED: { label: 'Changements demandés', tone: 'blue' },
  VENUE_SUSPENDED: { label: 'Suspendu', tone: 'red' },
  VENUE_REINSTATED: { label: 'Réactivé', tone: 'emerald' },
  VENUE_FEATURED: { label: 'Mis en avant', tone: 'amber' },
  VENUE_UNFEATURED: { label: 'Retiré Vedette', tone: 'neutral' },
  VENUE_SUBMITTED_FOR_REVIEW: { label: 'Soumis pour examen', tone: 'amber' },
  VENUE_CREATED: { label: 'Créé', tone: 'neutral' },
  VENUE_UPDATED: { label: 'Modifié', tone: 'neutral' },
  VENUE_DELETED: { label: 'Supprimé', tone: 'red' },
};

function AuditEntry({ entry }: { entry: AuditLogEntry }) {
  const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, tone: 'neutral' as const };
  const actor = typeof entry.userId === 'object' ? entry.userId : null;
  return (
    <li className="px-4 py-3 flex items-start gap-3">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0',
          meta.tone === 'emerald' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          meta.tone === 'red' && 'border-red-500/30 bg-red-500/10 text-red-300',
          meta.tone === 'blue' && 'border-blue-500/30 bg-blue-500/10 text-blue-300',
          meta.tone === 'amber' && 'border-amber-400/30 bg-amber-400/10 text-amber-300',
          meta.tone === 'neutral' && 'border-white/15 bg-white/[0.04] text-neutral-400'
        )}
      >
        {meta.label}
      </span>
      <div className="flex-1 min-w-0 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-300">
            {actor ? (actor.fullName ?? actor.email ?? 'Admin') : 'Système'}
          </span>
          <span className="text-neutral-600 tabular-nums">
            {new Date(entry.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {entry.details && Object.keys(entry.details).length > 0 && (
          <pre className="mt-1 text-[10px] text-neutral-600 whitespace-pre-wrap font-mono">
            {JSON.stringify(entry.details, null, 0).slice(0, 240)}
          </pre>
        )}
      </div>
    </li>
  );
}

/* ─── atoms ─────────────────────────────────────────────────────── */

function StatusBadge({ meta, small }: { meta: { label: string; tone: 'amber' | 'emerald' | 'red' | 'neutral' | 'blue' }; small?: boolean }) {
  const tone = {
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
    neutral: 'border-white/15 bg-white/[0.04] text-neutral-400',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  }[meta.tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-widest', tone, small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]')}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function CountChip({ label, count, tone }: { label: string; count: number; tone: 'amber' | 'emerald' | 'red' | 'blue' }) {
  const cls = {
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  }[tone];
  return (
    <span className={cn('hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs font-semibold', cls)}>
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

function Section({ title, headerRight, children }: { title: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{title}</h3>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold text-neutral-200 truncate', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}
