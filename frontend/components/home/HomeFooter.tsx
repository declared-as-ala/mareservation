import Link from 'next/link';
import { AppContainer } from '@/components/shared/AppContainer';
import { Facebook, Instagram, Linkedin } from 'lucide-react';

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function HomeFooter() {
  return (
    <footer className="border-t border-amber-500/25 bg-[#0a0a0a] py-16 text-amber-100/80">
      <AppContainer>
        <div className="grid grid-cols-1 gap-12 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-4 lg:gap-16">
          {/* 1) Brand */}
          <div className="mx-auto max-w-sm space-y-5 sm:mx-0">
            <div className="space-y-1">
              <Link
                href="/"
                className="inline-block font-serif text-3xl font-bold tracking-wide text-amber-200"
              >
                MaTable
              </Link>
              <div className="text-xs font-medium tracking-[0.18em] text-amber-300/70">
                MA RÉSERVATION
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-amber-100/55">
              Réservez votre table, votre expérience et votre moment d&apos;exception —
              partout où l&apos;ambiance compte.
            </p>
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="group flex size-10 items-center justify-center rounded-full border border-amber-500/25 bg-white/0 text-amber-200/80 transition-all hover:-translate-y-0.5 hover:border-amber-400/70 hover:bg-amber-500/10 hover:text-amber-200"
                >
                  <Icon className="size-[18px] transition-transform group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>

          {/* 2) Explorer */}
          <div className="space-y-5">
            <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
              Explorer
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/cafes" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Cafés
                </Link>
              </li>
              <li>
                <Link href="/restaurants" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href="/hotels" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Hôtels
                </Link>
              </li>
              <li>
                <Link href="/cinema" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Cinéma
                </Link>
              </li>
              <li>
                <Link href="/evenements" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Événements
                </Link>
              </li>
            </ul>
          </div>

          {/* 3) Support */}
          <div className="space-y-5">
            <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
              Support
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/contact" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/comment-ca-marche" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Comment ça marche
                </Link>
              </li>
            </ul>
          </div>

          {/* 4) Legal / Pro */}
          <div className="space-y-5">
            <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
              Légal / Pro
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/pour-les-etablissements"
                  className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]"
                >
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]">
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link
                  href="/mentions-legales"
                  className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/mentions-legales"
                  className="text-[13px] text-amber-100/55 transition-colors hover:text-[#d4af37]"
                >
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-amber-500/15 pt-8">
          <p className="text-center text-xs text-amber-100/40">
            © {new Date().getFullYear()} MaTable. Tous droits réservés.
          </p>
        </div>
      </AppContainer>
    </footer>
  );
}
