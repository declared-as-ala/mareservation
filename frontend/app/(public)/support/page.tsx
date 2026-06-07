'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchMyCases,
  fetchCaseDetail,
  openSupportCase,
  replyToCase,
  closeCase,
  type SupportCase,
  type SupportCaseCategory,
} from '@/lib/api/support';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: 'Ouvert',      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',       icon: Clock },
  in_progress: { label: 'En cours',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',          icon: MessageCircle },
  resolved:    { label: 'Résolu',      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  closed:      { label: 'Fermé',       color: 'text-zinc-500 bg-zinc-700/20 border-zinc-700/30',          icon: X },
};

const CATEGORIES: { value: SupportCaseCategory; label: string }[] = [
  { value: 'reservation', label: 'Réservation' },
  { value: 'payment',     label: 'Paiement' },
  { value: 'venue',       label: 'Établissement' },
  { value: 'account',     label: 'Mon compte' },
  { value: 'other',       label: 'Autre' },
];

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
  return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── New Case Form ── */
function NewCaseForm({ onSuccess }: { onSuccess: () => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportCaseCategory>('other');
  const [body, setBody] = useState('');

  const mut = useMutation({
    mutationFn: () => openSupportCase({ subject, category, body }),
    onSuccess: () => { toast.success('Dossier ouvert.'); onSuccess(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Sujet *</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder="Décrivez votre problème en une ligne"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Catégorie</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SupportCaseCategory)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Détails *</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Expliquez votre situation en détail…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none resize-none"
        />
      </div>
      <button
        disabled={!subject.trim() || !body.trim() || mut.isPending}
        onClick={() => mut.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Envoyer
      </button>
    </div>
  );
}

/* ── Case Detail Thread ── */
function CaseThread({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: c, isLoading } = useQuery({
    queryKey: ['support-case', caseId],
    queryFn: () => fetchCaseDetail(caseId),
  });

  const replyMut = useMutation({
    mutationFn: () => replyToCase(caseId, reply),
    onSuccess: () => { setReply(''); qc.invalidateQueries({ queryKey: ['support-case', caseId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: () => closeCase(caseId),
    onSuccess: () => { toast.success('Dossier fermé.'); qc.invalidateQueries({ queryKey: ['support-cases', 'support-case', caseId] }); onBack(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>;
  if (!c) return <p className="text-center text-zinc-500">Introuvable.</p>;

  const isOpen = !['resolved', 'closed'].includes(c.status);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start text-xs text-zinc-500 hover:text-zinc-300">
        ← Retour
      </button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{c.subject}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            #{c.caseNumber} · {CATEGORIES.find((cat) => cat.value === c.category)?.label ?? c.category}
          </p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {(c.messages ?? []).map((m, i) => {
          const isSupport = m.sender === 'admin';
          return (
            <div key={i} className={cn('flex gap-3', isSupport ? 'flex-row' : 'flex-row-reverse')}>
              <div className={cn('h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold',
                isSupport ? 'bg-amber-400/20 text-amber-400' : 'bg-zinc-800 text-zinc-300')}>
                {isSupport ? 'S' : 'M'}
              </div>
              <div className={cn('max-w-[80%] rounded-xl px-4 py-2.5',
                isSupport ? 'bg-zinc-800/80' : 'bg-zinc-900 border border-zinc-800')}>
                <p className="text-sm text-zinc-100 whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{fmtDate(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      {isOpen && (
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Votre réponse…"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none resize-none"
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

      {isOpen && (
        <button
          onClick={() => closeMut.mutate()}
          disabled={closeMut.isPending}
          className="self-start text-xs text-zinc-600 hover:text-zinc-400"
        >
          Marquer comme résolu et fermer
        </button>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function SupportPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['support-cases'],
    queryFn: fetchMyCases,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Support</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Contactez notre équipe pour toute question ou problème.</p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Nouveau dossier
          </button>
        )}
      </div>

      {view === 'new' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">Ouvrir un dossier</h2>
            <button onClick={() => setView('list')} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <NewCaseForm onSuccess={() => { setView('list'); qc.invalidateQueries({ queryKey: ['support-cases'] }); }} />
        </div>
      )}

      {view === 'detail' && selectedId && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <CaseThread caseId={selectedId} onBack={() => { setView('list'); qc.invalidateQueries({ queryKey: ['support-cases'] }); }} />
        </div>
      )}

      {view === 'list' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
          ) : cases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Aucun dossier pour l&apos;instant.</p>
              <button onClick={() => setView('new')} className="mt-3 text-xs text-amber-400 hover:underline">
                Créer votre premier dossier →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <button
                  key={c._id}
                  onClick={() => { setSelectedId(c._id); setView('detail'); }}
                  className="group flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:border-zinc-700"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{c.subject}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      #{c.caseNumber} · {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600 group-hover:text-zinc-400" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
