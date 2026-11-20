import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Consistent editorial page frame for content pages (forest header, ivory body). */
export function PageShell({
  eyebrow,
  title,
  intro,
  children,
  narrow = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="bg-[#0B0B0C]">
      <header className="relative overflow-hidden bg-[#0B0B0C] pb-14 pt-14 text-white sm:pb-20 sm:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(251,191,36,0.10),transparent)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-10">
          {eyebrow && (
            <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-amber-400">{eyebrow}</p>
          )}
          <h1 className="max-w-3xl font-serif text-[clamp(2.4rem,6vw,4.4rem)] font-medium leading-[1]">{title}</h1>
          {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{intro}</p>}
        </div>
      </header>
      <div className={cn('mx-auto px-4 py-14 sm:px-6 sm:py-20 lg:px-10', narrow ? 'max-w-3xl' : 'max-w-6xl')}>{children}</div>
    </div>
  );
}

/** Marks information we cannot know (legal entity, registration numbers…). Visible on purpose. */
export function Pending({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-400/25 px-1.5 py-0.5 text-[0.9em] font-medium text-amber-200">
      [À compléter : {children}]
    </mark>
  );
}

export function DraftBanner({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="mb-10 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm leading-relaxed text-amber-100">
      <strong className="font-semibold">Document en cours de finalisation.</strong> {children}
    </div>
  );
}

export const proseClasses =
  'space-y-5 text-[1.02rem] leading-relaxed text-neutral-400 [&_h2]:mb-3 [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-3xl [&_h2]:font-medium [&_h2]:text-white [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_a]:text-amber-400 [&_a]:underline';
