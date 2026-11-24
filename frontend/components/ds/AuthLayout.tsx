import type { ReactNode } from 'react';
import { Check, Rotate3d } from 'lucide-react';

/**
 * Shared authentication layout: photo panel (lg+) + compact form column.
 * Height = viewport minus the 72px navbar, so the primary action stays visible on 1366×768.
 * On mobile the form comes first; the photo panel is not rendered.
 */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4.5rem)] bg-[#faf7f1] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="on-dark relative hidden overflow-hidden lg:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/album/villa-01.webp" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/90 backdrop-blur">
            <Rotate3d className="size-3.5" /> Visites 360° avant réservation
          </p>
          <p className="mt-4 max-w-md text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-white">Les plus belles maisons d’hôtes de Tunisie, vues de l’intérieur.</p>
          <ul className="mt-6 space-y-2.5 text-[14px] text-white/80">
            {['Parcourez chaque pièce en 360°', 'Disponibilités et prix en temps réel', 'Confirmation par e-mail, sans paiement en ligne'].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><Check className="size-4 text-[#e0a527]" />{t}</li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex items-start justify-center px-5 py-10 sm:px-8 lg:items-center lg:py-8">
        <div className="ex-fade-up w-full max-w-[400px]">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#17140f]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-[#6f6758]">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-[14px] text-[#6f6758]">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
