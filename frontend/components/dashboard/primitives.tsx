'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────────────────
   Shared dashboard primitives — used by both the owner and admin dashboards.
   Dark base + amber-400 gold accent, consistent with the public site.
   ────────────────────────────────────────────────────────────────────────── */

/* ── PageHeader ── */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-400">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Card ── */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.07] bg-white/[0.02]',
        padded && 'p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── SectionTitle ── */
export function SectionTitle({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-amber-400" />}
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
          {subtitle && <p className="text-[11px] text-neutral-600">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── StatCard ── */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        accent
          ? 'border-amber-400/25 bg-amber-400/[0.06]'
          : 'border-white/[0.07] bg-white/[0.02]'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
        {Icon && <Icon className={cn('size-4', accent ? 'text-amber-400' : 'text-neutral-600')} />}
      </div>
      <div className="mt-1.5 font-serif text-2xl font-bold text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-600">{hint}</div>}
    </div>
  );
}

/* ── EmptyState ── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]">
        <Icon className="size-7 text-neutral-700" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-neutral-300">{title}</h3>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── StatusBadge — one canonical status → color/label map ── */
type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_MAP: Record<string, { tone: StatusTone; label: string }> = {
  // reservation
  confirmed: { tone: 'success', label: 'Confirmée' },
  pending: { tone: 'warning', label: 'En attente' },
  checked_in: { tone: 'info', label: 'Arrivé' },
  completed: { tone: 'neutral', label: 'Terminée' },
  cancelled: { tone: 'danger', label: 'Annulée' },
  no_show: { tone: 'danger', label: 'No-show' },
  // payment
  paid: { tone: 'success', label: 'Payé' },
  unpaid: { tone: 'warning', label: 'Non payé' },
  failed: { tone: 'danger', label: 'Échoué' },
  refunded: { tone: 'info', label: 'Remboursé' },
  // approval
  approved: { tone: 'success', label: 'Approuvé' },
  pending_review: { tone: 'warning', label: 'En revue' },
  changes_requested: { tone: 'warning', label: 'Modifications' },
  rejected: { tone: 'danger', label: 'Refusé' },
  suspended: { tone: 'danger', label: 'Suspendu' },
  draft: { tone: 'neutral', label: 'Brouillon' },
  active: { tone: 'success', label: 'Actif' },
  inactive: { tone: 'neutral', label: 'Inactif' },
};

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  danger: 'border-red-500/25 bg-red-500/10 text-red-400',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-400',
  neutral: 'border-white/10 bg-white/[0.05] text-neutral-400',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = String(status).toLowerCase();
  const entry = STATUS_MAP[key] ?? { tone: 'neutral' as StatusTone, label: label ?? status };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        TONE_CLASS[entry.tone]
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label ?? entry.label}
    </span>
  );
}

/* ── FormSection — a grouped block of fields ── */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-white/[0.06] pt-6 first:border-0 first:pt-0">
      <div>
        <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-neutral-600">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ── FormField — label + control + helper/error ── */
export function FormField({
  label,
  htmlFor,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1 text-xs font-medium text-neutral-400"
      >
        {label}
        {required && <span className="text-amber-400">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-400">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-[11px] text-neutral-600">{helper}</p>
      ) : null}
    </div>
  );
}

/** Shared input className for plain text/number/date inputs inside FormField. */
export const dashInput =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20';
