import { AppContainer } from '@/components/shared/AppContainer';
import Link from 'next/link';

export function SignupCardsSection() {
  return (
    <section className="bg-[#050506] py-16 text-amber-50">
      <AppContainer>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Users card */}
          <div className="flex flex-col items-center rounded-2xl border border-amber-500/20 bg-[#0a0b0c] px-8 py-10 text-center">
            <h3 className="font-serif text-xl font-semibold text-amber-100">
              Inscription Utilisateurs
            </h3>
            <p className="mt-3 max-w-xs text-sm text-amber-100/60">
              Réservez vos lieux préférés en quelques clics.
            </p>
            <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
              <Link
                href="/register"
                className="inline-flex justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
              >
                Créer un compte
              </Link>
            </div>
          </div>

          {/* Establishments card */}
          <div className="flex flex-col items-center rounded-2xl border border-amber-500/20 bg-[#0a0b0c] px-8 py-10 text-center">
            <h3 className="font-serif text-xl font-semibold text-amber-100">
              Inscription Établissements
            </h3>
            <p className="mt-3 max-w-xs text-sm text-amber-100/60">
              Attirez plus de clients grâce à MaTable.
            </p>
            <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
              <Link
                href="/pour-les-etablissements"
                className="inline-flex justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
              >
                Inscrire mon établissement
              </Link>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>
  );
}
