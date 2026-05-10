'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin, ArrowUpRight, Heart } from 'lucide-react';

const categories = [
  { label: 'Explorer en 360°', href: '/explorer' },
  { label: 'Cafés', href: '/cafes' },
  { label: 'Restaurants', href: '/restaurants' },
  { label: 'Hôtels', href: '/hotels' },
  { label: 'Cinéma', href: '/cinema' },
  { label: 'Événements', href: '/evenements' },
];

const company = [
  { label: 'À propos', href: '/a-propos' },
  { label: 'Comment ça marche', href: '/comment-ca-marche' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
  { label: 'SOS Conseil', href: '/sos-conseil' },
];

const legal = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'Conditions générales', href: '/cgv' },
  { label: 'Politique de confidentialité', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
];

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/mareservation', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/mareservation', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com/mareservation', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/mareservation', label: 'LinkedIn' },
];

export function Footer({ hideNewsletter }: { hideNewsletter?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-black/95 border-t border-white/[0.06]">
      {/* Gold top accent line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

      {/* ===== Newsletter (optional) ===== */}
      {!hideNewsletter && (
        <section className="border-b border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-amber-400/10">
                <div className="size-2 rounded-full bg-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-100 sm:text-2xl">
                Restez informé de nos dernières offres
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-500">
                Inscrivez-vous à notre newsletter pour recevoir nos meilleures offres et nouveautés.
              </p>
              <form className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:gap-0">
                <input
                  type="email"
                  placeholder="Votre adresse email"
                  autoComplete="email"
                  className="flex-1 min-w-0 rounded-l-xl rounded-r-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:z-10 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 sm:rounded-r-none transition-all duration-200"
                />
                <button
                  type="submit"
                  className="h-[46px] rounded-xl bg-amber-400 px-6 text-sm font-semibold text-black hover:bg-amber-300 active:bg-amber-500 transition-all duration-200 shadow-sm hover:shadow-amber-500/25 sm:rounded-l-none sm:rounded-r-xl shrink-0"
                >
                  S&apos;inscrire
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* ===== Main Footer ===== */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-12 lg:gap-6">

            {/* ── Brand ── */}
            <div className="sm:col-span-2 lg:col-span-4">
              <Link href="/" className="inline-block mb-5 transition-transform duration-300 hover:scale-[1.02]">
                <Image
                  src="/logo.png"
                  alt="Ma Table"
                  width={200}
                  height={55}
                  className="h-16 sm:h-20 w-auto object-contain"
                  priority
                />
              </Link>
              <p className="text-[15px] leading-relaxed text-neutral-500 mb-6 max-w-sm">
                Réservez vos tables, chambres et places en quelques clics. Une expérience premium pour vos moments spéciaux.
              </p>

              {/* Social */}
              <div className="flex items-center gap-2.5">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-neutral-500 transition-all duration-200 hover:border-amber-400/30 hover:text-amber-400 hover:bg-amber-400/[0.06]"
                    >
                      <Icon className="size-[18px]" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* ── Explorer ── */}
            <div className="sm:col-span-1 lg:col-span-2 lg:col-start-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-100 mb-5">
                Explorer
              </h4>
              <ul className="flex flex-col gap-1">
                {categories.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between py-2.5 text-[14px] text-neutral-500 transition-colors duration-200 hover:text-amber-400"
                    >
                      <span className="truncate">{link.label}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-60 group-hover:translate-x-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Entreprise ── */}
            <div className="sm:col-span-1 lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-100 mb-5">
                Entreprise
              </h4>
              <ul className="flex flex-col gap-1">
                {company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between py-2.5 text-[14px] text-neutral-500 transition-colors duration-200 hover:text-amber-400"
                    >
                      <span className="truncate">{link.label}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-60 group-hover:translate-x-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Contact ── */}
            <div className="sm:col-span-2 lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-100 mb-5">
                Contact
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <a
                    href="mailto:contact@mareservation.com"
                    className="group flex items-start gap-3 py-1 text-[14px] text-neutral-500 transition-colors duration-200 hover:text-amber-400"
                  >
                    <Mail className="size-[18px] shrink-0 mt-0.5 text-neutral-600 group-hover:text-amber-400 transition-colors" />
                    <span className="leading-snug break-all">contact@mareservation.com</span>
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+21612345678"
                    className="group flex items-start gap-3 py-1 text-[14px] text-neutral-500 transition-colors duration-200 hover:text-amber-400"
                  >
                    <Phone className="size-[18px] shrink-0 mt-0.5 text-neutral-600 group-hover:text-amber-400 transition-colors" />
                    <span className="leading-snug whitespace-nowrap">+216 12 345 678</span>
                  </a>
                </li>
                <li>
                  <div className="flex items-start gap-3 py-1 text-[14px] text-neutral-500">
                    <MapPin className="size-[18px] shrink-0 mt-0.5 text-neutral-600" />
                    <span className="leading-snug">Tunis, Tunisie</span>
                  </div>
                </li>
              </ul>

              {/* Legal */}
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-100 mb-4">
                  Légal
                </h4>
                <ul className="flex flex-col gap-1">
                  {legal.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block py-2 text-[14px] text-neutral-500 transition-colors duration-200 hover:text-amber-400"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== Bottom Bar ===== */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-neutral-600 text-center sm:text-left order-2 sm:order-1">
              © {currentYear} Ma Table. Tous droits réservés.
            </p>

            {/* Quick legal links — desktop */}
            <div className="hidden md:flex items-center gap-5 order-1 sm:order-2">
              {legal.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-neutral-600 transition-colors duration-200 hover:text-amber-400"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-neutral-600 order-3">
              Fait avec <Heart className="size-3.5 text-amber-400 fill-amber-400" /> en Tunisie
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
