'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Loader2,
  Hotel,
  X,
  CalendarRange,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch, apiPostRaw, apiPatchRaw, apiDeleteRaw } from '@/lib/api/client';
import { fetchOwnerVenues } from '@/lib/api/owner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import type { Venue } from '@/lib/api/types';

/* ─── Types ──────────────────────────────────────────────────────────── */

type RuleKind =
  | 'seasonal'
  | 'weekend'
  | 'holiday'
  | 'min_nights'
  | 'max_nights'
  | 'last_minute'
  | 'early_booking';

interface PricingRule {
  _id: string;
  venueId: string;
  kind: RuleKind;
  label: string;
  startsAt?: string;
  endsAt?: string;
  daysOfWeek?: number[];
  multiplier?: number;
  amount?: number;
  minNights?: number;
  maxNights?: number;
  windowDays?: number;
  priority: number;
  isActive: boolean;
}

type PromoKind = 'percent' | 'amount' | 'free_night';

interface PromoCode {
  _id: string;
  code: string;
  kind: PromoKind;
  value: number;
  scope: 'global' | 'venue';
  venueId?: string;
  startsAt?: string;
  endsAt?: string;
  minNights?: number;
  maxUses?: number;
  usedCount?: number;
  isActive: boolean;
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const RULE_KIND_LABELS: Record<RuleKind, string> = {
  seasonal: 'Saisonnier',
  weekend: 'Week-end',
  holiday: 'Férié',
  min_nights: 'Nuits min.',
  max_nights: 'Nuits max.',
  last_minute: 'Dernière minute',
  early_booking: 'Réservation anticipée',
};

const RULE_KIND_COLORS: Record<RuleKind, string> = {
  seasonal: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  weekend: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  holiday: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  min_nights: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  max_nights: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  last_minute: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  early_booking: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const PROMO_KIND_LABELS: Record<PromoKind, string> = {
  percent: 'Pourcentage',
  amount: 'Montant fixe',
  free_night: 'Nuit gratuite',
};

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all';

const labelCls = 'mb-1.5 block text-xs font-medium text-neutral-400';

/* ─── Helpers ────────────────────────────────────────────────────────── */

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMultiplier(v?: number) {
  if (v == null) return null;
  const pct = Math.round((v - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/* ─── Field wrapper ──────────────────────────────────────────────────── */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="ml-1 text-amber-400">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── Rule form modal ────────────────────────────────────────────────── */

const RULE_KIND_OPTIONS: { value: RuleKind; label: string }[] = [
  { value: 'seasonal', label: 'Saisonnier — plage de dates + multiplicateur' },
  { value: 'weekend', label: 'Week-end — jours de semaine + multiplicateur' },
  { value: 'holiday', label: 'Férié — plage de dates + multiplicateur' },
  { value: 'min_nights', label: 'Nuits minimum' },
  { value: 'max_nights', label: 'Nuits maximum' },
  { value: 'last_minute', label: 'Dernière minute — fenêtre + multiplicateur' },
  { value: 'early_booking', label: 'Réservation anticipée — fenêtre + multiplicateur' },
];

interface RuleFormState {
  label: string;
  kind: RuleKind;
  isActive: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
  multiplier: string;
  daysOfWeek: number[];
  minNights: string;
  maxNights: string;
  windowDays: string;
}

function emptyRuleForm(override?: Partial<RuleFormState>): RuleFormState {
  return {
    label: '',
    kind: 'seasonal',
    isActive: true,
    priority: 5,
    startsAt: '',
    endsAt: '',
    multiplier: '1.2',
    daysOfWeek: [5, 6],
    minNights: '2',
    maxNights: '14',
    windowDays: '7',
    ...override,
  };
}

function ruleToForm(r: PricingRule): RuleFormState {
  return {
    label: r.label,
    kind: r.kind,
    isActive: r.isActive,
    priority: r.priority,
    startsAt: r.startsAt ? r.startsAt.slice(0, 10) : '',
    endsAt: r.endsAt ? r.endsAt.slice(0, 10) : '',
    multiplier: String(r.multiplier ?? '1.2'),
    daysOfWeek: r.daysOfWeek ?? [5, 6],
    minNights: String(r.minNights ?? 2),
    maxNights: String(r.maxNights ?? 14),
    windowDays: String(r.windowDays ?? 7),
  };
}

function RuleModal({
  venueId,
  editRule,
  onClose,
  onSaved,
}: {
  venueId: string;
  editRule?: PricingRule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RuleFormState>(
    editRule ? ruleToForm(editRule) : emptyRuleForm()
  );

  const set = (k: keyof RuleFormState, v: RuleFormState[keyof RuleFormState]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleDay = (d: number) =>
    setForm((p) => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(d)
        ? p.daysOfWeek.filter((x) => x !== d)
        : [...p.daysOfWeek, d].sort(),
    }));

  function buildPayload() {
    const base: Record<string, unknown> = {
      label: form.label.trim(),
      kind: form.kind,
      isActive: form.isActive,
      priority: Number(form.priority),
    };
    if (['seasonal', 'holiday'].includes(form.kind)) {
      if (form.startsAt) base.startsAt = new Date(form.startsAt + 'T00:00:00').toISOString();
      if (form.endsAt) base.endsAt = new Date(form.endsAt + 'T00:00:00').toISOString();
      base.multiplier = parseFloat(form.multiplier) || 1;
    } else if (form.kind === 'weekend') {
      base.daysOfWeek = form.daysOfWeek;
      base.multiplier = parseFloat(form.multiplier) || 1;
    } else if (form.kind === 'min_nights') {
      base.minNights = parseInt(form.minNights) || 2;
    } else if (form.kind === 'max_nights') {
      base.maxNights = parseInt(form.maxNights) || 14;
    } else if (['last_minute', 'early_booking'].includes(form.kind)) {
      base.windowDays = parseInt(form.windowDays) || 7;
      base.multiplier = parseFloat(form.multiplier) || 1;
    }
    return base;
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      if (editRule) {
        return apiPatchRaw(`/pricing/owner/rules/${editRule._id}`, payload);
      }
      return apiPostRaw(`/pricing/owner/venues/${venueId}/rules`, payload);
    },
    onSuccess: () => {
      toast.success(editRule ? 'Règle mise à jour' : 'Règle créée');
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const isDateKind = form.kind === 'seasonal' || form.kind === 'holiday';
  const isWeekend = form.kind === 'weekend';
  const isMinNights = form.kind === 'min_nights';
  const isMaxNights = form.kind === 'max_nights';
  const isWindowKind = form.kind === 'last_minute' || form.kind === 'early_booking';
  const needsMultiplier = isDateKind || isWeekend || isWindowKind;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-400 font-bold">Règle tarifaire</p>
            <h2 className="text-lg font-semibold text-white">
              {editRule ? 'Modifier la règle' : 'Nouvelle règle'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 grid place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <Field label="Libellé" required>
            <input
              type="text"
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              className={inputCls}
              placeholder="Ex. Haute saison estivale"
            />
          </Field>

          <Field label="Type de règle" required>
            <select
              value={form.kind}
              onChange={(e) => set('kind', e.target.value as RuleKind)}
              className={cn(inputCls, 'bg-[#0D0D0D]')}
            >
              {RULE_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0D0D0D]">
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Date range */}
          {isDateKind && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date de début">
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Date de fin">
                <input
                  type="date"
                  value={form.endsAt}
                  min={form.startsAt}
                  onChange={(e) => set('endsAt', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* Days of week */}
          {isWeekend && (
            <Field label="Jours de la semaine">
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS_FR.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      'h-9 w-12 rounded-lg border text-xs font-medium transition',
                      form.daysOfWeek.includes(i)
                        ? 'border-amber-400/50 bg-amber-400/[0.1] text-amber-300'
                        : 'border-white/[0.08] bg-white/[0.02] text-neutral-500 hover:border-white/20'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Multiplier */}
          {needsMultiplier && (
            <Field label="Multiplicateur (ex. 1.3 = +30%, 0.85 = -15%)">
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="5"
                value={form.multiplier}
                onChange={(e) => set('multiplier', e.target.value)}
                className={inputCls}
                placeholder="1.2"
              />
            </Field>
          )}

          {/* min nights */}
          {isMinNights && (
            <Field label="Nombre de nuits minimum" required>
              <input
                type="number"
                min="1"
                max="365"
                value={form.minNights}
                onChange={(e) => set('minNights', e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          {/* max nights */}
          {isMaxNights && (
            <Field label="Nombre de nuits maximum" required>
              <input
                type="number"
                min="1"
                max="365"
                value={form.maxNights}
                onChange={(e) => set('maxNights', e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          {/* window days */}
          {isWindowKind && (
            <Field label={form.kind === 'last_minute' ? 'Fenêtre (jours avant arrivée)' : 'Fenêtre (jours à l\'avance)'}>
              <input
                type="number"
                min="1"
                max="365"
                value={form.windowDays}
                onChange={(e) => set('windowDays', e.target.value)}
                className={inputCls}
                placeholder={form.kind === 'last_minute' ? '7' : '30'}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priorité (0-10)">
              <input
                type="number"
                min="0"
                max="10"
                value={form.priority}
                onChange={(e) => set('priority', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Active">
              <div className="flex items-center h-[42px]">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => set('isActive', v)}
                />
                <span className="ml-2 text-sm text-neutral-400">{form.isActive ? 'Oui' : 'Non'}</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-neutral-400 hover:text-white hover:border-white/20 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={saveMut.isPending || !form.label.trim()}
            onClick={() => saveMut.mutate()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-amber-400/20"
          >
            {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editRule ? 'Enregistrer' : 'Créer la règle'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Promo form modal ───────────────────────────────────────────────── */

interface PromoFormState {
  code: string;
  kind: PromoKind;
  value: string;
  minNights: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
}

function emptyPromoForm(): PromoFormState {
  return { code: '', kind: 'percent', value: '10', minNights: '', maxUses: '', startsAt: '', endsAt: '' };
}

function promoToForm(p: PromoCode): PromoFormState {
  return {
    code: p.code,
    kind: p.kind,
    value: String(p.value),
    minNights: p.minNights != null ? String(p.minNights) : '',
    maxUses: p.maxUses != null ? String(p.maxUses) : '',
    startsAt: p.startsAt ? p.startsAt.slice(0, 10) : '',
    endsAt: p.endsAt ? p.endsAt.slice(0, 10) : '',
  };
}

function PromoModal({
  venueId,
  editPromo,
  onClose,
  onSaved,
}: {
  venueId: string;
  editPromo?: PromoCode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PromoFormState>(
    editPromo ? promoToForm(editPromo) : emptyPromoForm()
  );

  const set = (k: keyof PromoFormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  function buildPayload() {
    const base: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      kind: form.kind,
      value: parseFloat(form.value) || 0,
      scope: 'venue',
      venueId,
    };
    if (form.minNights) base.minNights = parseInt(form.minNights);
    if (form.maxUses) base.maxUses = parseInt(form.maxUses);
    if (form.startsAt) base.startsAt = new Date(form.startsAt + 'T00:00:00').toISOString();
    if (form.endsAt) base.endsAt = new Date(form.endsAt + 'T23:59:59').toISOString();
    return base;
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      if (editPromo) {
        return apiPatchRaw(`/pricing/promo-codes/${editPromo._id}`, payload);
      }
      return apiPostRaw('/pricing/promo-codes', payload);
    },
    onSuccess: () => {
      toast.success(editPromo ? 'Code promo mis à jour' : 'Code promo créé');
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const valueLabel =
    form.kind === 'percent'
      ? 'Valeur (%)'
      : form.kind === 'amount'
      ? 'Valeur (TND)'
      : 'Nuits offertes';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-400 font-bold">Codes promo</p>
            <h2 className="text-lg font-semibold text-white">
              {editPromo ? 'Modifier le code' : 'Nouveau code promo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 grid place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <Field label="Code promo" required>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="SUMMER25"
            />
          </Field>

          <Field label="Type" required>
            <select
              value={form.kind}
              onChange={(e) => set('kind', e.target.value)}
              className={cn(inputCls, 'bg-[#0D0D0D]')}
            >
              {(Object.entries(PROMO_KIND_LABELS) as [PromoKind, string][]).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#0D0D0D]">{v}</option>
              ))}
            </select>
          </Field>

          <Field label={valueLabel} required>
            <input
              type="number"
              min="0"
              step={form.kind === 'percent' ? '1' : '0.1'}
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début">
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Date de fin">
              <input
                type="date"
                value={form.endsAt}
                min={form.startsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Nuits minimum">
              <input
                type="number"
                min="1"
                value={form.minNights}
                onChange={(e) => set('minNights', e.target.value)}
                className={inputCls}
                placeholder="—"
              />
            </Field>
            <Field label="Utilisations max.">
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => set('maxUses', e.target.value)}
                className={inputCls}
                placeholder="Illimité"
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-neutral-400 hover:text-white hover:border-white/20 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={saveMut.isPending || !form.code.trim()}
            onClick={() => saveMut.mutate()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-amber-400/20"
          >
            {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
            {editPromo ? 'Enregistrer' : 'Créer le code'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Rules tab ──────────────────────────────────────────────────────── */

function RulesTab({ venueId }: { venueId: string }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<PricingRule | undefined>();

  const { data: rules = [], isLoading } = useQuery<PricingRule[]>({
    queryKey: ['pricing-rules', venueId],
    queryFn: async () => {
      const res = await apiFetch<PricingRule[]>(`/pricing/owner/venues/${venueId}/rules`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!venueId,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPatchRaw(`/pricing/owner/rules/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-rules', venueId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDeleteRaw(`/pricing/owner/rules/${id}`),
    onSuccess: () => {
      toast.success('Règle supprimée');
      qc.invalidateQueries({ queryKey: ['pricing-rules', venueId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const openEdit = (r: PricingRule) => {
    setEditRule(r);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRule(undefined);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-neutral-200">Règles tarifaires</h2>
        <button
          type="button"
          onClick={() => { setEditRule(undefined); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold transition shadow shadow-amber-400/20"
        >
          <Plus className="size-4" />
          Ajouter une règle
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-600">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarRange className="size-10 mx-auto text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500">Aucune règle tarifaire pour cet hôtel.</p>
          <p className="text-xs text-neutral-600 mt-1">Créez une règle saisonnière, week-end, ou dernière minute.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-600 text-xs">
                <th className="text-left px-4 py-3 font-medium">Libellé</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Plage / Jours</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Effet</th>
                <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Priorité</th>
                <th className="text-center px-4 py-3 font-medium">Actif</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rules.map((r) => (
                <tr key={r._id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-200">{r.label}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium', RULE_KIND_COLORS[r.kind])}>
                      {RULE_KIND_LABELS[r.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 hidden lg:table-cell">
                    {(r.kind === 'seasonal' || r.kind === 'holiday') && (
                      <span>{fmtDate(r.startsAt)} → {fmtDate(r.endsAt)}</span>
                    )}
                    {r.kind === 'weekend' && (
                      <span>{r.daysOfWeek?.map((d) => DAYS_FR[d]).join(', ') ?? '—'}</span>
                    )}
                    {r.kind === 'min_nights' && <span>Min. {r.minNights} nuits</span>}
                    {r.kind === 'max_nights' && <span>Max. {r.maxNights} nuits</span>}
                    {(r.kind === 'last_minute' || r.kind === 'early_booking') && (
                      <span>{r.windowDays}j fenêtre</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {r.multiplier != null ? (
                      <span className={cn(
                        'text-xs font-semibold',
                        r.multiplier >= 1 ? 'text-rose-400' : 'text-emerald-400'
                      )}>
                        {fmtMultiplier(r.multiplier)}
                      </span>
                    ) : r.minNights != null ? (
                      <span className="text-xs text-neutral-500">≥ {r.minNights}n</span>
                    ) : r.maxNights != null ? (
                      <span className="text-xs text-neutral-500">≤ {r.maxNights}n</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-xs text-neutral-500 tabular-nums">{r.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleMut.mutate({ id: r._id, isActive: !r.isActive })}
                      className="text-neutral-500 hover:text-amber-400 transition"
                      title={r.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {r.isActive
                        ? <ToggleRight className="size-5 text-amber-400" />
                        : <ToggleLeft className="size-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="size-8 grid place-items-center rounded-lg border border-white/[0.08] text-neutral-500 hover:text-amber-300 hover:border-amber-400/30 transition"
                        title="Modifier"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="size-8 grid place-items-center rounded-lg border border-white/[0.08] text-neutral-500 hover:text-red-400 hover:border-red-400/30 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.08] text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
                            <AlertDialogDescription className="text-neutral-500">
                              La règle &ldquo;{r.label}&rdquo; sera supprimée définitivement.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.06]">
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMut.mutate(r._id)}
                              className="bg-red-500 hover:bg-red-400 text-white"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <RuleModal
          venueId={venueId}
          editRule={editRule}
          onClose={closeModal}
          onSaved={() => qc.invalidateQueries({ queryKey: ['pricing-rules', venueId] })}
        />
      )}
    </>
  );
}

/* ─── Promo codes tab ────────────────────────────────────────────────── */

const PROMO_KIND_COLORS: Record<PromoKind, string> = {
  percent: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  amount: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  free_night: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

function PromoCodesTab({ venueId }: { venueId: string }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<PromoCode | undefined>();

  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ['pricing-promos', venueId],
    queryFn: async () => {
      const res = await apiFetch<PromoCode[]>('/pricing/promo-codes');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!venueId,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPatchRaw(`/pricing/promo-codes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-promos', venueId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const openEdit = (p: PromoCode) => {
    setEditPromo(p);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPromo(undefined);
  };

  function fmtPromoValue(p: PromoCode) {
    if (p.kind === 'percent') return `-${p.value}%`;
    if (p.kind === 'amount') return `-${p.value} TND`;
    return `${p.value} nuit${p.value > 1 ? 's' : ''} offerte${p.value > 1 ? 's' : ''}`;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-neutral-200">Codes promo</h2>
        <button
          type="button"
          onClick={() => { setEditPromo(undefined); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold transition shadow shadow-amber-400/20"
        >
          <Plus className="size-4" />
          Créer un code
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-600">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : promos.length === 0 ? (
        <div className="py-16 text-center">
          <Tag className="size-10 mx-auto text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500">Aucun code promo pour cet hôtel.</p>
          <p className="text-xs text-neutral-600 mt-1">Créez un code de réduction pour vos clients.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-600 text-xs">
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium">Valeur</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Portée</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Utilisations</th>
                <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Validité</th>
                <th className="text-center px-4 py-3 font-medium">Actif</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {promos.map((p) => (
                <tr key={p._id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-amber-300 tracking-wider">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium', PROMO_KIND_COLORS[p.kind])}>
                      {PROMO_KIND_LABELS[p.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-emerald-400">{fmtPromoValue(p)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                      p.scope === 'global'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
                    )}>
                      {p.scope === 'global' ? 'Global' : 'Cet hôtel'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {p.usedCount ?? 0}{p.maxUses != null ? ` / ${p.maxUses}` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-neutral-500">
                    {p.startsAt || p.endsAt
                      ? <>{fmtDate(p.startsAt)} → {fmtDate(p.endsAt)}</>
                      : <span className="text-neutral-700">Toujours</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleMut.mutate({ id: p._id, isActive: !p.isActive })}
                      className="text-neutral-500 hover:text-amber-400 transition"
                      title={p.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {p.isActive
                        ? <ToggleRight className="size-5 text-amber-400" />
                        : <ToggleLeft className="size-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.scope !== 'global' && (
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="size-8 grid place-items-center rounded-lg border border-white/[0.08] text-neutral-500 hover:text-amber-300 hover:border-amber-400/30 transition"
                        title="Modifier"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PromoModal
          venueId={venueId}
          editPromo={editPromo}
          onClose={closeModal}
          onSaved={() => qc.invalidateQueries({ queryKey: ['pricing-promos', venueId] })}
        />
      )}
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

type TabId = 'rules' | 'promos';

export default function OwnerPricingPage() {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('rules');

  const { data: venues = [], isLoading: venuesLoading } = useQuery<Venue[]>({
    queryKey: ['owner-venues-pricing'],
    queryFn: fetchOwnerVenues,
  });

  useEffect(() => {
    if (!selectedVenueId && venues.length) {
      const firstHotel = venues.find((v) => v.type === 'HOTEL') ?? venues[0];
      setSelectedVenueId(firstHotel._id);
    }
  }, [venues, selectedVenueId]);

  const selectedVenue = venues.find((v) => v._id === selectedVenueId);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'rules', label: 'Règles tarifaires', icon: CalendarRange },
    { id: 'promos', label: 'Codes promo', icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080808]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center gap-3">
          <Link
            href="/owner"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-amber-400 hover:border-amber-400/40 transition-all"
          >
            <ArrowLeft className="size-3.5" />
            Espace propriétaire
          </Link>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Espace propriétaire</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">Tarification</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Venue picker */}
        {venuesLoading ? (
          <div className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Chargement des établissements…</span>
          </div>
        ) : venues.length === 0 ? (
          <div className="py-20 text-center">
            <Hotel className="size-12 mx-auto text-neutral-700 mb-3" />
            <p className="text-sm text-neutral-500">Aucun établissement rattaché à votre compte.</p>
          </div>
        ) : (
          <>
            {venues.length > 1 && (
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-2">Établissement</p>
                <div className="flex flex-wrap gap-2">
                  {venues.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => setSelectedVenueId(v._id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 h-9 px-4 rounded-full border text-sm font-medium transition',
                        v._id === selectedVenueId
                          ? 'border-amber-400/50 bg-amber-400/[0.1] text-amber-300'
                          : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-neutral-200'
                      )}
                    >
                      <Hotel className="size-3.5" />
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedVenue && (
              <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-1.5">
                <div className="flex items-center gap-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition',
                        activeTab === t.id
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-300'
                      )}
                    >
                      <t.icon className="size-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedVenueId && selectedVenue && (
              <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-6">
                {activeTab === 'rules' && <RulesTab venueId={selectedVenueId} />}
                {activeTab === 'promos' && <PromoCodesTab venueId={selectedVenueId} />}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
