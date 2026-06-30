'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  Mail, Phone, MapPin, Facebook, Instagram, Twitter,
  Linkedin, ArrowUpRight, Heart, Send, Globe, Shield,
  ChevronDown, ChevronUp,
} from 'lucide-react';

/* ─────────────────── Data ─────────────────── */
const explore = [
  { label: 'Explorer en 360°', href: '/explorer' },
  { label: 'Cafés & Salons',   href: '/cafes' },
  { label: 'Restaurants',      href: '/restaurants' },
  { label: 'Hôtels & Resorts', href: '/hotels' },
  { label: 'Cinéma',           href: '/cinema' },
  { label: 'Événements',       href: '/evenements' },
  { label: 'Coworking',        href: '/coworking' },
];

const company = [
  { label: 'À propos',          href: '/a-propos' },
  { label: 'Comment ça marche', href: '/comment-ca-marche' },
  { label: 'Devenir partenaire',href: '/owner' },
  { label: 'SOS Conseil',       href: '/sos-conseil' },
  { label: 'Contact',           href: '/contact' },
  { label: 'FAQ',               href: '/faq' },
];

const legal = [
  { label: 'Mentions légales',          href: '/mentions-legales' },
  { label: 'Conditions générales',      href: '/cgv' },
  { label: 'Politique de confidentialité', href: '/politique-de-confidentialite' },
];

const social = [
  { Icon: Facebook,  href: 'https://facebook.com/mareservation',  label: 'Facebook' },
  { Icon: Instagram, href: 'https://instagram.com/mareservation', label: 'Instagram' },
  { Icon: Twitter,   href: 'https://twitter.com/mareservation',   label: 'Twitter / X' },
  { Icon: Linkedin,  href: 'https://linkedin.com/company/mareservation', label: 'LinkedIn' },
];

// Stats removed to avoid showing fictional numbers during testing phase

/* ─────────────────── Accordion (mobile) ─────────────────── */
function MobileAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-white/80"
      >
        {title}
        {open ? (
          <ChevronUp className="size-4 text-amber-400/70 shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-zinc-600 shrink-0" />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

/* ─────────────────── Footer ─────────────────── */
export function Footer({ hideNewsletter }: { hideNewsletter?: boolean }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const year = new Date().getFullYear();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(''); }
  };

  return (
    <footer className="relative bg-[#080808]">
      {/* ── Amber gradient line at top ── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* ══════════════════════════════════════
          TOP BAND — stats + newsletter
          ══════════════════════════════════════ */}
      {!hideNewsletter && (
        <div className="border-b border-white/[0.05] bg-[#0a0a0a]">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-md">
                <p className="text-sm font-bold text-white">
                  Restez informé de nos offres
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Recevez les meilleures adresses et offres exclusives directement dans votre boîte.
                </p>
              </div>

              {/* Newsletter */}
              <div className="w-full max-w-md">
                {subscribed ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
                    <span className="text-lg">✦</span>
                    <span className="text-sm font-semibold text-amber-300">
                      Merci ! Vous êtes maintenant abonné.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                        required
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.06] transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-black transition-all hover:bg-amber-300 active:scale-95 shrink-0"
                    >
                      <Send className="size-3.5" />
                      <span className="hidden sm:inline">S&apos;inscrire</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          MAIN FOOTER GRID — desktop
          ══════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-5 pt-14 pb-10 sm:px-8 lg:px-12">

        {/* ── Desktop grid ── */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-8 lg:gap-12">

          {/* Brand — 4 cols */}
          <div className="md:col-span-4">
            <Link href="/" className="inline-block mb-5 transition-opacity hover:opacity-80">
              <Image
                src="/logo.png"
                alt="Before you go"
                width={180}
                height={50}
                className="h-14 w-auto object-contain"
                priority
              />
            </Link>
            <p className="text-sm leading-relaxed text-zinc-500 mb-6 max-w-xs">
              Réservez vos tables, chambres et places en quelques clics —
              une expérience premium pour vos moments d&apos;exception.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2.5 mb-8">
              {social.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-600 transition-all duration-200 hover:border-amber-400/40 hover:bg-amber-400/[0.08] hover:text-amber-400 hover:-translate-y-0.5"
                >
                  <Icon className="size-4 transition-transform group-hover:scale-110" />
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[12px] text-zinc-700">
                <Shield className="size-3.5 text-amber-400/50" />
                Paiement 100% sécurisé
              </div>
              <div className="flex items-center gap-2 text-[12px] text-zinc-700">
                <Globe className="size-3.5 text-amber-400/50" />
                Disponible partout en Tunisie
              </div>
            </div>
          </div>

          {/* Explorer — 2 cols */}
          <div className="md:col-span-2">
            <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400/80">
              Explorer
            </h4>
            <ul className="space-y-0.5">
              {explore.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center justify-between py-2 text-[13px] text-zinc-500 transition-colors hover:text-amber-400"
                  >
                    <span>{label}</span>
                    <ArrowUpRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-60 group-hover:translate-x-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise — 2 cols */}
          <div className="md:col-span-2">
            <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400/80">
              Entreprise
            </h4>
            <ul className="space-y-0.5">
              {company.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center justify-between py-2 text-[13px] text-zinc-500 transition-colors hover:text-amber-400"
                  >
                    <span>{label}</span>
                    <ArrowUpRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-60 group-hover:translate-x-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Legal — 4 cols */}
          <div className="md:col-span-4">
            <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400/80">
              Contact
            </h4>
            <ul className="space-y-3 mb-7">
              <li>
                <a
                  href="mailto:contact@mareservation.com"
                  className="group flex items-start gap-3 text-[13px] text-zinc-500 transition-colors hover:text-amber-400"
                >
                  <Mail className="size-4 shrink-0 mt-0.5 text-zinc-700 group-hover:text-amber-400 transition-colors" />
                  <span className="break-all">contact@mareservation.com</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+21612345678"
                  className="group flex items-center gap-3 text-[13px] text-zinc-500 transition-colors hover:text-amber-400"
                >
                  <Phone className="size-4 shrink-0 text-zinc-700 group-hover:text-amber-400 transition-colors" />
                  +216 12 345 678
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-[13px] text-zinc-500">
                  <MapPin className="size-4 shrink-0 text-zinc-700" />
                  Tunis, Tunisie
                </div>
              </li>
            </ul>

            {/* Legal links */}
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-700">
                Légal
              </h4>
              <ul className="space-y-1.5">
                {legal.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[12px] text-zinc-600 transition-colors hover:text-amber-400"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Mobile accordion ── */}
        <div className="md:hidden">
          {/* Brand */}
          <div className="mb-6 text-center">
            <Link href="/" className="inline-block mb-4">
              <Image src="/logo.png" alt="Ma Réservation" width={140} height={40} className="h-12 w-auto object-contain mx-auto" priority />
            </Link>
            <p className="text-sm leading-relaxed text-zinc-500 mb-5 max-w-xs mx-auto">
              Réservez vos tables, chambres et places en quelques clics — une expérience premium pour vos moments d&apos;exception.
            </p>
            {/* Social */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {social.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-600 transition-all hover:border-amber-400/40 hover:text-amber-400">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Accordions */}
          <MobileAccordion title="Explorer">
            <ul className="space-y-1">
              {explore.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="block py-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </MobileAccordion>

          <MobileAccordion title="Entreprise">
            <ul className="space-y-1">
              {company.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="block py-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </MobileAccordion>

          <MobileAccordion title="Contact">
            <ul className="space-y-3 pt-1">
              <li>
                <a href="mailto:contact@mareservation.com" className="flex items-center gap-3 text-sm text-zinc-500 hover:text-amber-400">
                  <Mail className="size-4 text-zinc-700 shrink-0" /> contact@mareservation.com
                </a>
              </li>
              <li>
                <a href="tel:+21612345678" className="flex items-center gap-3 text-sm text-zinc-500 hover:text-amber-400">
                  <Phone className="size-4 text-zinc-700 shrink-0" /> +216 12 345 678
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <MapPin className="size-4 text-zinc-700 shrink-0" /> Tunis, Tunisie
                </div>
              </li>
            </ul>
          </MobileAccordion>

          <MobileAccordion title="Légal">
            <ul className="space-y-1">
              {legal.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="block py-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </MobileAccordion>
        </div>
      </div>

      {/* ══════════════════════════════════════
          BOTTOM BAR
          ══════════════════════════════════════ */}
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            {/* Copyright */}
            <p className="text-center text-xs text-zinc-700 sm:text-left order-2 sm:order-1">
              © {year} Ma Réservation. Tous droits réservés.
            </p>

            {/* Legal quick links — desktop only */}
            <div className="hidden sm:flex items-center gap-5 order-1 sm:order-2">
              {legal.map(({ label, href }) => (
                <Link key={href} href={href} className="text-xs text-zinc-700 transition-colors hover:text-amber-400">
                  {label}
                </Link>
              ))}
            </div>

            {/* Made with love */}
            <p className="flex items-center gap-1.5 text-xs text-zinc-700 order-3">
              Fait avec <Heart className="size-3.5 fill-amber-400 text-amber-400" /> en Tunisie
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
