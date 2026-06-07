/**
 * Premium world section: gradient overlay, gold glow, vignette, and 3 stat cards.
 * Image: set worldMapImage in landingData.ts or use CSS-only effect.
 */
import { worldMapImage } from '../../data/landingData';

const stats = [
  { label: 'Tunisie — Lancement', value: '2026' },
  { label: '+200 lieux (objectif)', value: 'Objectif' },
  { label: 'Réservation immersive 360°', value: 'Ma Reservation' },
];

export function WorldSection() {
  return (
    <section className="w-full bg-landing-bg py-14 md:py-20 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-center text-landing-text text-lg md:text-xl font-medium mb-10 md:mb-14 max-w-2xl mx-auto">
          La plateforme de réservation immersive présente bientôt dans le monde entier
        </h2>

        <div className="relative rounded-2xl overflow-hidden aspect-[2/1] max-h-[420px] min-h-[280px]">
          {/* Background: subtle map or gradient */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${worldMapImage})` }}
          />
          {/* Dark base so text is readable */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(22,22,22,0.4) 0%, rgba(22,22,22,0.85) 50%, rgba(22,22,22,0.95) 100%)',
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)',
            }}
          />
          {/* Gold glow accents */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(circle at 25% 45%, rgba(201,162,39,0.25) 0%, transparent 45%), radial-gradient(circle at 75% 55%, rgba(201,162,39,0.2) 0%, transparent 40%)',
            }}
          />

          {/* Stats cards overlayed */}
          <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 p-6">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-xl border border-landing-border bg-landing-card/95 backdrop-blur-sm px-6 py-4 text-center min-w-[180px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,162,39,0.1)',
                }}
              >
                <div className="text-landing-gold font-semibold text-lg mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {stat.value}
                </div>
                <div className="text-landing-text-muted text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
