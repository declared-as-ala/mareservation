import { Link } from 'react-router';
import { heroImage } from '../../data/landingData';

export function Hero() {
  return (
    <section className="relative w-full min-h-[85vh] md:min-h-[90vh] flex items-center">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Overlay gradient for readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(22,22,22,0.92) 0%, rgba(22,22,22,0.75) 45%, rgba(22,22,22,0.4) 100%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-xl">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-landing-gold mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Réservez votre table
            <br />
            et votre expérience
            <br />
            avant d'y aller
          </h1>
          <p className="text-base md:text-lg text-landing-text text-landing-text-muted leading-relaxed mb-8 max-w-lg">
            Cafés, restaurants, hôtels, spas et lieux premium — Découvrez-les grâce à la visite
            virtuelle immersive et confirmez votre réservation en ligne.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/explorer"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm shadow-[0_4px_14px_rgba(201,162,39,0.4)] hover:bg-landing-gold-light transition-colors"
            >
              Explorer les lieux
            </Link>
            <Link
              to="/proposer"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-transparent border border-landing-gold text-landing-text font-medium text-sm hover:bg-landing-gold/10 transition-colors"
            >
              Je suis un établissement
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
