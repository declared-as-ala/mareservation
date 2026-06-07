import { Link } from 'react-router';

export function SignupCards() {
  return (
    <section className="w-full bg-landing-bg py-14 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Card 1: Utilisateurs */}
          <div
            className="rounded-xl border border-landing-border bg-landing-card p-6 md:p-8 flex flex-col"
            style={{
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,162,39,0.15)',
            }}
          >
            <h3 className="text-landing-text text-lg font-semibold mb-6">
              Inscription Utilisateurs
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:bg-landing-gold-light transition-colors"
              >
                Créer un compte
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#2d3a4d] text-landing-text font-medium text-sm border border-landing-border/50 hover:bg-[#364153] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continuer avec Facebook
              </button>
            </div>
            <p className="text-landing-text-muted text-sm mt-auto">
              Réservez vos lieux préférés en quelques clics
            </p>
          </div>

          {/* Card 2: Établissements */}
          <div
            className="rounded-xl border border-landing-border bg-landing-card p-6 md:p-8 flex flex-col"
            style={{
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,162,39,0.15)',
            }}
          >
            <h3 className="text-landing-text text-lg font-semibold mb-6">
              Inscription Établissements
            </h3>
            <Link
              to="/proposer"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:bg-landing-gold-light transition-colors w-fit mb-6"
            >
              Inscrire mon établissement
            </Link>
            <p className="text-landing-text-muted text-sm mt-auto">
              Attirez plus de clients grâce à Ma Reservation
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
