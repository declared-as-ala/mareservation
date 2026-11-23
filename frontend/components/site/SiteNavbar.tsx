'use client';

/**
 * Public navbar — HostMe information architecture in Exploria360 black & gold:
 * [logo · compact "Où en Tunisie ?"]  [Accueil · Explorer · Devenir hôte]  [FR/EN/AR · Se connecter · S'inscrire | account]
 * Transparent over the home hero, solid on scroll / other pages. Mobile: drawer.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CalendarCheck2, ChevronDown, Globe, LayoutDashboard, LogOut, Menu, Search, Shield, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex shrink-0 flex-col justify-center leading-none outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded-lg', className)} aria-label="Exploria360 — accueil">
      <span className="brand-word bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text font-serif text-[17px] font-black uppercase tracking-[0.2em] text-transparent lg:text-[20px]">
        Exploria&nbsp;<span className="text-amber-400">360</span>
      </span>
      <span className="mt-1 text-[8px] font-medium uppercase tracking-[0.15em] text-neutral-400 lg:text-[9px]">
        Explorez l&apos;instant, <span className="text-amber-300/85">réservez l&apos;expérience</span>
      </span>
    </Link>
  );
}

function useClickOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open, close]);
  return ref;
}

function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={t('nav.language')} onClick={() => setOpen((o) => !o)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] hover:text-white">
        <Globe className="size-4" aria-hidden="true" /> {LOCALES.find((l) => l.code === locale)?.short}
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul role="menu" className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-44 overflow-hidden rounded-2xl border border-white/12 bg-[#141415] p-1.5 shadow-2xl">
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button role="menuitemradio" aria-checked={locale === l.code} type="button" onClick={() => { setLocale(l.code as Locale); setOpen(false); }} className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm', locale === l.code ? 'bg-amber-400/12 text-amber-200' : 'text-neutral-200 hover:bg-white/[0.06]')}>
                {l.label} <span className="text-xs text-neutral-500">{l.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountMenu() {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  if (!user) return null;
  const role = String(user.role);
  const initials = (user.fullName || user.email || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const items = [
    role === 'ADMIN' && { href: '/admin/dashboard', label: t('nav.admin'), icon: Shield },
    role === 'ESTABLISHMENT_OWNER' && { href: '/owner', label: t('nav.ownerSpace'), icon: LayoutDashboard },
    { href: '/mes-reservations', label: t('nav.bookings'), icon: CalendarCheck2 },
    { href: role === 'ADMIN' ? '/admin/settings' : '/profile', label: t('nav.account'), icon: UserRound },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Shield }[];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] ps-1.5 pe-3 hover:border-amber-400/50">
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-xs font-black text-black">{initials}</span>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-white xl:block">{user.fullName?.split(' ')[0]}</span>
        <ChevronDown className="size-3.5 text-white/70" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-2xl border border-white/12 bg-[#141415] p-1.5 shadow-2xl">
          <div className="border-b border-white/10 px-3 py-3">
            <p className="truncate font-semibold text-white">{user.fullName}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/[0.06]">
              <Icon className="size-4 text-amber-300" aria-hidden="true" /> {label}
            </Link>
          ))}
          <button role="menuitem" type="button" onClick={async () => { setOpen(false); await logout(); router.push('/'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.06]">
            <LogOut className="size-4" aria-hidden="true" /> {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const overHero = pathname === '/' || pathname === '/devenir-hote';

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawer]);

  const links = [
    { href: '/', label: t('nav.home'), active: pathname === '/' },
    { href: '/accommodations', label: t('nav.explore'), active: pathname.startsWith('/accommodation') || pathname === '/carte' },
    { href: '/devenir-hote', label: t('nav.host'), active: pathname === '/devenir-hote' },
  ];
  const solid = scrolled || !overHero;
  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/accommodations?where=${encodeURIComponent(q.trim())}` : '/accommodations');
  };

  return (
    <>
      <header className={cn('fixed inset-x-0 top-0 z-[60] transition-[background-color,border-color,backdrop-filter] duration-300', !solid && 'on-dark', solid ? 'border-b border-white/10 bg-[#0B0B0C]/92 backdrop-blur-xl' : 'border-b border-transparent bg-gradient-to-b from-black/60 to-transparent')}>
        <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Brand />
          <form onSubmit={goSearch} role="search" className="ms-2 hidden min-w-0 lg:block">
            <label className="flex h-11 w-56 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm text-white focus-within:border-amber-400/60 xl:w-64">
              <Search className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="sr-only">{t('nav.where')}</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav.where')} className="w-full bg-transparent placeholder:text-white/55 focus:outline-none" />
            </label>
          </form>

          <nav aria-label="Navigation principale" className="mx-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={l.active ? 'page' : undefined} className={cn('relative inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold transition-colors', l.active ? 'text-amber-300' : 'text-white/80 hover:bg-white/[0.06] hover:text-white')}>
                    {l.label}
                    {l.active && <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-1.5 md:ms-0">
            <div className="hidden md:block"><LanguageMenu /></div>
            {user ? (
              <AccountMenu />
            ) : (
              <>
                <Link href="/login" className="hidden h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold text-white hover:bg-white/[0.07] lg:inline-flex">{t('nav.login')}</Link>
                <Link href="/register" className="hidden h-11 items-center whitespace-nowrap rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-5 text-sm font-bold text-black shadow-[0_8px_22px_rgba(245,158,11,0.3)] hover:brightness-110 sm:inline-flex">{t('nav.signup')}</Link>
              </>
            )}
            <button type="button" onClick={() => setDrawer(true)} aria-label={t('nav.menu')} aria-expanded={drawer} className="grid size-11 place-items-center rounded-full border border-white/15 text-white md:hidden">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
      {/* Spacer on pages without a hero underneath */}
      {!overHero && <div className="h-[4.5rem]" aria-hidden="true" />}

      {drawer && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[86%] max-w-sm flex-col border-s border-white/10 bg-[#0E0E0F] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer" className="grid size-11 place-items-center rounded-full border border-white/15 text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={goSearch} role="search" className="mt-6">
              <label className="flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-4 text-white">
                <Search className="size-4 text-amber-300" aria-hidden="true" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav.where')} className="w-full bg-transparent text-[16px] placeholder:text-white/50 focus:outline-none" />
              </label>
            </form>
            <nav className="mt-4" aria-label="Navigation principale">
              {links.map((l) => (
                <Link key={l.href} href={l.href} aria-current={l.active ? 'page' : undefined} className={cn('flex h-13 items-center border-b border-white/[0.06] py-4 font-serif text-2xl', l.active ? 'text-amber-300' : 'text-white')}>{l.label}</Link>
              ))}
            </nav>
            <div className="mt-6 flex gap-2" role="group" aria-label={t('nav.language')}>
              {LOCALES.map((l) => (
                <button key={l.code} type="button" aria-pressed={locale === l.code} onClick={() => setLocale(l.code)} className={cn('h-10 flex-1 rounded-full border text-sm font-semibold', locale === l.code ? 'border-amber-400 bg-amber-400/12 text-amber-200' : 'border-white/15 text-neutral-300')}>{l.short}</button>
              ))}
            </div>
            <div className="mt-auto grid gap-2 pt-6">
              {user ? (
                <>
                  {user.role === 'ADMIN' && <Link href="/admin/dashboard" className="flex h-12 items-center justify-center rounded-2xl border border-white/15 font-semibold text-white">{t('nav.admin')}</Link>}
                  {user.role === 'ESTABLISHMENT_OWNER' && <Link href="/owner" className="flex h-12 items-center justify-center rounded-2xl border border-white/15 font-semibold text-white">{t('nav.ownerSpace')}</Link>}
                  <Link href="/mes-reservations" className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-black">{t('nav.bookings')}</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex h-12 items-center justify-center rounded-2xl border border-white/15 font-semibold text-white">{t('nav.login')}</Link>
                  <Link href="/register" className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-black">{t('nav.signup')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
