'use client';

/**
 * Exploria360 super-admin design system (light premium SaaS).
 * Tokens: page #F8F7F4 · surface #FFF · ink #171717 · muted #6B6760 · line #E7E4DD
 * gold #C99628 (fills, accents) · gold-ink #8A6514 (gold text, ≥ 4.5:1 on white) · gold-hover #B0831F.
 */
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Loader2, Minus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/* ── formatting (Tunisia) ─────────────────────────────────── */
export const TZ = 'Africa/Tunis';
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
export const fmtInt = (n: number | null | undefined) => (n == null ? '—' : nf.format(n));
export const fmtTND = (n: number | null | undefined, decimals = false) => (n == null ? '—' : `${(decimals ? nf2 : nf).format(n)} TND`);
export const fmtCompactTND = (n: number) => (Math.abs(n) >= 10_000 ? `${nf.format(Math.round(n / 1000))} k` : nf.format(n));
/** Stay days are stored as UTC midnights → format them in UTC so the calendar day never shifts. */
export const fmtStayDay = (iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('fr-FR', { ...opts, timeZone: 'UTC' });
export const fmtDateTime = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—';
export const fmtDay = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—';
export const todayTunis = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/* ── buttons ──────────────────────────────────────────────── */
export const btn = {
  base: 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99628]/50 disabled:pointer-events-none disabled:opacity-50',
  primary: 'bg-[#C99628] text-[#171717] hover:bg-[#B0831F]',
  dark: 'bg-[#171717] text-[#FFFFFF] hover:bg-[#2a2a2a]',
  outline: 'border border-[#E7E4DD] bg-white text-[#171717] hover:bg-[#F4F2EE]',
  ghost: 'text-[#4A4740] hover:bg-[#F1EFEA] hover:text-[#171717]',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  success: 'bg-emerald-600 text-[#FFFFFF] hover:bg-emerald-700',
};
export const button = (variant: keyof typeof btn = 'outline', extra?: string) => cn(btn.base, btn[variant], extra);

export const inputCls =
  'h-10 w-full rounded-lg border border-[#E2DED6] bg-white px-3 text-[13.5px] text-[#171717] shadow-[0_1px_2px_rgba(23,23,23,0.04)] placeholder:text-[#8F897D] hover:border-[#CFCAC0] focus:border-[#C99628] focus:outline-none focus:ring-[3px] focus:ring-[#C99628]/20 disabled:cursor-not-allowed disabled:bg-[#F4F2EE] disabled:text-[#8A867E]';
export const selectCls = cn(inputCls, 'pr-8');
export const labelCls = 'mb-1.5 block text-[12.5px] font-semibold text-[#3D3A34]';

/* ── layout ───────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, breadcrumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: string; href?: string }[] }) {
  return (
    <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {breadcrumbs && (
          <nav aria-label="Fil d’Ariane" className="mb-1.5 flex flex-wrap items-center gap-1 text-[12px] text-[#8A867E]">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {b.href ? <Link href={b.href} className="hover:text-[#171717]">{b.label}</Link> : <span className="text-[#4A4740]">{b.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em] text-[#171717] sm:text-[24px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-[#6B6760]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, subtitle, action, children, className, bodyClassName }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-[#E7E4DD] bg-white shadow-[0_1px_2px_rgba(23,23,23,0.04)]', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold text-[#171717]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] text-[#8A867E]">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:px-5', title || action ? 'pt-3' : '', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── KPI ──────────────────────────────────────────────────── */
export function Change({ pct, pts, invert }: { pct?: number | null; pts?: number | null; invert?: boolean }) {
  const v = pct ?? pts;
  if (v == null) return <span className="text-[11px] text-[#9A968D]">Pas de comparaison</span>;
  const up = v > 0;
  const flat = v === 0;
  const good = flat ? null : invert ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', good == null ? 'bg-[#F1EFEA] text-[#6B6760]' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
      <Icon className="size-3" aria-hidden="true" />
      {up ? '+' : ''}
      {pts != null && pct == null ? `${v.toLocaleString('fr-FR')} pts` : `${v.toLocaleString('fr-FR')} %`}
    </span>
  );
}

export function KpiCard({
  label, value, icon: Icon, footer, href, tone = 'default', tooltip, loading,
}: {
  label: string; value: ReactNode; icon: React.ComponentType<{ className?: string }>; footer?: ReactNode; href?: string;
  tone?: 'default' | 'warning' | 'gold'; tooltip?: string; loading?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B6760]">
          {label}
          {tooltip && (
            <span className="group/tt relative inline-flex">
              <Info className="size-3.5 text-[#9A968D]" aria-label={tooltip} />
              <span role="tooltip" className="pointer-events-none absolute left-1/2 top-5 z-20 hidden w-64 -translate-x-1/2 rounded-lg bg-[#171717] p-2.5 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-[#FFFFFF] shadow-lg group-hover/tt:block group-focus-within/tt:block">
                {tooltip}
              </span>
            </span>
          )}
        </p>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-[#F7F1E3] text-[#8A6514]')}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-1.5 min-h-[34px] text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#171717] tabular-nums">
        {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded-md bg-[#F1EFEA]" /> : value}
      </div>
      {footer && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A867E]">{footer}</div>}
    </>
  );
  const cls = cn(
    'block min-w-0 rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(23,23,23,0.04)] transition-[border-color,box-shadow]',
    tone === 'warning' ? 'border-amber-200' : 'border-[#E7E4DD]',
    href && 'hover:border-[#C99628]/50 hover:shadow-[0_4px_14px_rgba(23,23,23,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99628]/40'
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/* ── status badges ────────────────────────────────────────── */
export const RES_STATUS: Record<string, { label: string; cls: string; color: string }> = {
  pending: { label: 'À confirmer', cls: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#E0A526' },
  confirmed: { label: 'Confirmée', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', color: '#16A34A' },
  checked_in: { label: 'En séjour', cls: 'bg-sky-50 text-sky-800 ring-sky-200', color: '#0284C7' },
  completed: { label: 'Terminée', cls: 'bg-slate-100 text-slate-700 ring-slate-200', color: '#64748B' },
  cancelled: { label: 'Annulée', cls: 'bg-red-50 text-red-700 ring-red-200', color: '#DC2626' },
  rejected: { label: 'Refusée', cls: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#BE123C' },
  expired: { label: 'Expirée', cls: 'bg-stone-100 text-stone-600 ring-stone-200', color: '#A8A29E' },
  no_show: { label: 'Non présenté', cls: 'bg-orange-50 text-orange-800 ring-orange-200', color: '#EA580C' },
};
export function StatusBadge({ status, map = RES_STATUS }: { status: string; map?: Record<string, { label: string; cls: string }> }) {
  const s = map[String(status).toLowerCase()] ?? { label: status, cls: 'bg-[#F1EFEA] text-[#4A4740] ring-[#E7E4DD]' };
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', s.cls)}>{s.label}</span>;
}
/** Publication state of a maison (admin-console/guesthouses → publicState). */
export const PUBLIC_STATE: Record<string, { label: string; cls: string }> = {
  published: { label: 'Publiée', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  draft: { label: 'Brouillon', cls: 'bg-[#F1EFEA] text-[#4A4740] ring-[#E7E4DD]' },
  pending_review: { label: 'En revue', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  suspended: { label: 'Suspendue', cls: 'bg-red-50 text-red-700 ring-red-200' },
};
export const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Non payé', cls: 'bg-[#F1EFEA] text-[#4A4740] ring-[#E7E4DD]' },
  pending: { label: 'Paiement en cours', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  paid: { label: 'Payé', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  failed: { label: 'Échec paiement', cls: 'bg-red-50 text-red-700 ring-red-200' },
  refunded: { label: 'Remboursé', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

/* ── states ───────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, text, action, compact }: { icon?: React.ComponentType<{ className?: string }>; title: string; text?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
      {Icon && (
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-[#F7F1E3] text-[#8A6514]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <p className="text-[14px] font-semibold text-[#171717]">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#6B6760]">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-lg bg-[#F1EFEA]', className)} />;
export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
      <span>{error instanceof Error ? error.message : 'Une erreur est survenue.'}</span>
      {onRetry && <button type="button" onClick={onRetry} className={button('danger', 'h-8')}>Réessayer</button>}
    </div>
  );
}
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />;

/* ── period selector ──────────────────────────────────────── */
export type PeriodPreset = 'today' | '7d' | '30d' | '90d' | 'custom';
export interface PeriodValue { preset: PeriodPreset; from: string; to: string }
export function periodFromPreset(preset: Exclude<PeriodPreset, 'custom'>): PeriodValue {
  const to = todayTunis();
  const n = { today: 0, '7d': 6, '30d': 29, '90d': 89 }[preset];
  return { preset, from: addDays(to, -n), to };
}
export function PeriodSelector({ value, onChange }: { value: PeriodValue; onChange: (v: PeriodValue) => void }) {
  const [custom, setCustom] = useState({ from: value.from, to: value.to });
  useEffect(() => setCustom({ from: value.from, to: value.to }), [value.from, value.to]);
  const presets: [Exclude<PeriodPreset, 'custom'>, string][] = [['today', 'Aujourd’hui'], ['7d', '7 j'], ['30d', '30 j'], ['90d', '90 j']];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Période" className="inline-flex rounded-lg border border-[#E7E4DD] bg-white p-0.5">
        {presets.map(([p, label]) => (
          <button
            key={p}
            type="button"
            aria-pressed={value.preset === p}
            onClick={() => onChange(periodFromPreset(p))}
            className={cn('h-8 rounded-md px-2.5 text-[12px] font-semibold transition-colors', value.preset === p ? 'bg-[#171717] text-[#FFFFFF]' : 'text-[#4A4740] hover:bg-[#F4F2EE]')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={cn('inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-0.5', value.preset === 'custom' ? 'border-[#C99628]' : 'border-[#E7E4DD]')}>
        <label className="sr-only" htmlFor="period-from">Du</label>
        <input id="period-from" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
          onBlur={() => custom.from && custom.to && onChange({ preset: 'custom', ...custom })} className="h-8 w-[8.6rem] bg-transparent text-[12px] text-[#171717] outline-none" />
        <span className="text-[12px] text-[#9A968D]" aria-hidden="true">→</span>
        <label className="sr-only" htmlFor="period-to">Au</label>
        <input id="period-to" type="date" value={custom.to} min={custom.from} max={todayTunis()} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
          onBlur={() => custom.from && custom.to && onChange({ preset: 'custom', ...custom })} className="h-8 w-[8.6rem] bg-transparent text-[12px] text-[#171717] outline-none" />
      </div>
    </div>
  );
}

/* ── drawer ───────────────────────────────────────────────── */
export function Drawer({ open, onOpenChange, title, description, children, footer, width = 'sm:max-w-xl' }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('w-full gap-0 border-[#E7E4DD] bg-white p-0 text-[#171717]', width)}>
        <div className="border-b border-[#E7E4DD] px-5 py-4 pr-12">
          <SheetTitle className="text-[16px] font-semibold text-[#171717]">{title}</SheetTitle>
          {description ? <SheetDescription className="mt-0.5 text-[12px] text-[#6B6760]">{description}</SheetDescription> : <SheetDescription className="sr-only">Détails</SheetDescription>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-[#E7E4DD] bg-[#FBFAF8] px-5 py-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

/* ── definition list row ──────────────────────────────────── */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[13px]">
      <dt className="shrink-0 text-[#6B6760]">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-[#171717]">{children}</dd>
    </div>
  );
}

/* ── table shell ──────────────────────────────────────────── */
export const th = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B6760] first:pl-4 last:pr-4';
export const td = 'whitespace-nowrap px-3 py-2.5 text-[13px] text-[#171717] first:pl-4 last:pr-4';
export function Pagination({ page, pages, total, onPage, label = 'résultats' }: { page: number; pages: number; total: number; onPage: (p: number) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#E7E4DD] px-4 py-2.5 text-[12px] text-[#6B6760]">
      <span>{fmtInt(total)} {label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={button('outline', 'h-8 px-2.5')} disabled={page <= 1} onClick={() => onPage(page - 1)}>Précédent</button>
        <span className="tabular-nums">{page} / {pages}</span>
        <button type="button" className={button('outline', 'h-8 px-2.5')} disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivant</button>
      </div>
    </div>
  );
}

/* ── modal (light, centered) ──────────────────────────────── */
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-5xl' }[size];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-[#E7E4DD] bg-white p-0 text-[#171717] shadow-[0_24px_70px_rgba(23,23,23,0.18)]', w)}>
        <div className="border-b border-[#EFEDE8] px-5 py-4 pr-12">
          <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-[#171717]">{title}</DialogTitle>
          {description ? <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-[#6B6760]">{description}</DialogDescription> : <DialogDescription className="sr-only">Fenêtre</DialogDescription>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EFEDE8] bg-[#FBFAF8] px-5 py-3">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
