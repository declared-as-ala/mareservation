'use client';

/**
 * Public footer — light ivory surface. Phones: brand, two link columns side by side, legal links as a compact
 * wrapped row. Tablet/desktop: brand + three columns.
 */
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
        { href: '/maisons-d-hotes', label: t('nav.explore') },
        { href: '/carte', label: t('footer.map') },
        { href: '/maisons-d-hotes?tour=1', label: t('home.360.cta') },
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
  ];
  const legal = {
    title: t('footer.legal'),
    links: [
      { href: '/cgv', label: t('footer.terms') },
      { href: '/cgv#annulation', label: t('footer.cancellation') },
      { href: '/confidentialite', label: t('footer.privacy') },
      { href: '/mentions-legales', label: t('footer.legalNotice') },
    ],
  };
  const linkCls = 'inline-flex min-h-9 items-center text-[14px] text-[#4A4538] transition-colors hover:text-[#8A5A00] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C99628] md:min-h-0';
  const headCls = 'text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A5A00]';

  return (
    <footer className="border-t border-[#17140F]/10 bg-[#F3EEE4] text-[#17140F]">
      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-10 sm:px-6 md:pt-14 lg:px-10 lg:pb-10 lg:pt-16">
        <div className="grid gap-8 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-10">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-4 text-[14px] leading-relaxed text-[#5F584D]">{t('footer.tagline')}</p>
            <div className="mt-5 h-px w-16 bg-gradient-to-r from-[#C99628] to-transparent" aria-hidden="true" />
          </div>

          {/* Explorer + Exploria360: side by side on phones, own columns from md */}
          <div className="grid grid-cols-2 gap-6 md:contents">
            {cols.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h2 className={headCls}>{c.title}</h2>
                <ul className="mt-3 space-y-0.5 md:mt-5 md:space-y-3">
                  {c.links.map((l) => (
                    <li key={l.href + l.label}><Link href={l.href} className={linkCls}>{l.label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <nav aria-label={legal.title} className="border-t border-[#17140F]/10 pt-6 md:border-0 md:pt-0">
            <h2 className={headCls}>{legal.title}</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-0.5 md:mt-5 md:block md:space-y-3">
              {legal.links.map((l) => (
                <li key={l.href + l.label}><Link href={l.href} className={linkCls}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-[#17140F]/10 pt-5 md:mt-12">
          <p className="text-[12.5px] text-[#7A7366]">© {new Date().getFullYear()} Exploria360. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
