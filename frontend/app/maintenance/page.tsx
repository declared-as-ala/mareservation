import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exploria 360 — Site en préparation',
  description: 'Notre plateforme de réservation immersive en 360° arrive très bientôt.',
};

export default function MaintenancePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#08080a] px-6 py-16 text-center text-neutral-100">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-500/[0.10] blur-[130px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-amber-400/[0.06] blur-[120px]" />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        {/* Wordmark */}
        <div className="flex flex-col items-center leading-none">
          <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text font-serif text-2xl font-black uppercase tracking-[0.22em] text-transparent drop-shadow-[0_1px_14px_rgba(212,175,55,0.3)] sm:text-3xl">
            Exploria&nbsp;<span className="text-amber-400">360</span>
          </span>
          <span className="mt-2 text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-400 sm:text-[10px]">
            Explorez l&apos;instant, <span className="text-amber-300/85">Réservez l&apos;expérience</span>
          </span>
        </div>

        {/* Badge */}
        <span className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-4 py-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">En construction</span>
        </span>

        {/* Heading */}
        <h1 className="mt-6 font-serif text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
          Notre site est en{' '}
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
            cours de préparation
          </span>
        </h1>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400 sm:text-base">
          Nous construisons une expérience de réservation <strong className="font-semibold text-neutral-200">immersive en 360°</strong> —
          cafés, restaurants, hôtels &amp; sorties. Revenez très bientôt&nbsp;!
        </p>

        {/* Progress bar (indeterminate) */}
        <div className="mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/2 animate-[maint-slide_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0" />
        </div>

        {/* Contact */}
        <p className="mt-10 text-xs text-neutral-500">
          Une question ou un partenariat&nbsp;?{' '}
          <a href="mailto:contact@exploria360.com" className="font-semibold text-amber-300 underline-offset-4 hover:underline">
            contact@exploria360.com
          </a>
        </p>

        <p className="mt-8 text-[11px] text-neutral-600">
          © {new Date().getFullYear()} Exploria 360 — Book your moment
        </p>
      </div>

      {/* Keyframes for the indeterminate progress bar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes maint-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}`,
        }}
      />
    </main>
  );
}
