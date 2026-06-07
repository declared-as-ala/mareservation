import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function OpsPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('ops-scope ops-page', className)}>{children}</div>;
}

export function OpsHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <section className="ops-band">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ops-title">{title}</h1>
          {subtitle ? <p className="ops-subtitle mt-1">{subtitle}</p> : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </section>
  );
}

export function OpsGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('grid gap-4', className)}>{children}</div>;
}

export function OpsCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn('ops-card', className)}>{children}</section>;
}

export function OpsSectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="ops-section-title">{title}</h2>
        {subtitle ? <p className="ops-subtitle">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function OpsKpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="ops-kpi">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="ops-kpi-label">{label}</p>
        {icon}
      </div>
      <p className="ops-kpi-value">{value}</p>
      {hint ? <p className="ops-kpi-hint">{hint}</p> : null}
    </article>
  );
}

export function OpsField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="ops-field">
      <span className="ops-label">{label}</span>
      {children}
      {helper ? <span className="ops-helper">{helper}</span> : null}
    </label>
  );
}

export function opsInputClassName(extra?: string) {
  return cn('ops-input', extra);
}

