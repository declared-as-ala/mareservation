'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Brand } from './SiteNavbar';

export function SiteFooter() {
  const { t } = useI18n();
  const cols = [
    {
      title: t('footer.explore'),
      links: [
        { href: '/', label: t('nav.home') },
        { href: '/accommodations', label: t('nav.explore') },
        { href: '/carte', label: t('footer.map') },
        { href: '/accommodations?tour=1', label: t('home.360.cta') },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { href: '/devenir-hote', label: t('nav.host') },
        { href: '/a-propos', label: t('footer.about') },
        { href: '/contact', label: t('footer.contact') },
        { href: '/faq', label: t('footer.faq') },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { href: '/cgv', label: t('footer.terms') },
        { href: '/cgv#annulation', label: t('footer.cancellation') },
        { href: '/confidentialite', label: t('footer.privacy') },
        { href: '/mentions-legales', label: t('footer.legalNotice') },
      ],
    },
  ];
  return (
    <footer className="on-dark border-t border-white/10 bg-[#070707] text-white">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)] lg:px-10 lg:py-20">
        <div>
          <Brand />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-400">{t('footer.tagline')}</p>
          <div className="mt-6 h-px w-16 bg-gradient-to-r from-amber-400 to-transparent" aria-hidden="true" />
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{c.title}</h2>
            <ul className="mt-5 space-y-3">
              {c.links.map((l) => (
                <li key={l.href + l.label}><Link href={l.href} className="text-sm text-neutral-300 transition-colors hover:text-amber-200">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.07]">
        <p className="mx-auto max-w-[1600px] px-4 py-6 text-xs text-neutral-500 sm:px-6 lg:px-10">© {new Date().getFullYear()} Exploria360. {t('footer.rights')}</p>
      </div>
    </footer>
  );
}
