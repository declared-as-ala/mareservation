'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
  CalendarDays,
  Compass,
  BriefcaseBusiness,
  BedDouble,
  UtensilsCrossed,
  Martini,
  Flower2,
  ChevronRight,
  Store,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCartStore } from '@/stores/cart';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Sheet, SheetContent, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { PartnerApplicationModal } from '@/components/partners/PartnerApplicationModal';

const primaryNav = [
  { label: 'Explorer en 360°', href: '/explorer', icon: Compass },
  { label: 'Coworking', href: '/coworking', icon: BriefcaseBusiness },
  { label: 'Événements', href: '/evenements', icon: CalendarDays },
];

const categoryNav = [
  { label: 'Hôtels', href: '/hotels', icon: BedDouble },
  { label: 'Restauration', href: '/restauration', icon: UtensilsCrossed },
  { label: 'Sorties', href: '/sorties', icon: Martini },
  { label: 'Bien-être', href: '/bien-etre', icon: Flower2 },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '?') || pathname.startsWith(href + '/');
}

/* Brand lockup — elegant gold tagline only (logo/wordmark removed). */
function Brand({ onClick, size = 'bar' }: { onClick?: () => void; size?: 'bar' | 'drawer' }) {
  const textCls =
    size === 'drawer'
      ? 'text-base sm:text-lg'
      : 'text-[13px] leading-[1.15] sm:text-[15px] sm:leading-tight lg:text-[19px]';
  return (
    <Link
      href="/"
      onClick={onClick}
      className="group flex shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
      aria-label="Explorez l'instant, Réservez l'expérience — accueil"
    >
      <span className={cn('max-w-[200px] font-serif font-semibold tracking-tight sm:max-w-none', textCls)}>
        <span className="text-neutral-100 transition-colors group-hover:text-white">Explorez l&apos;instant,</span>{' '}
        <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_1px_8px_rgba(212,175,55,0.25)]">
          Réservez l&apos;expérience
        </span>
      </span>
    </Link>
  );
}

export function HomeNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const { user, isLoading: authLoading } = useAuth();
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function go(e: React.FormEvent, close?: boolean) {
    e.preventDefault();
    if (close) setMobileOpen(false);
    const q = searchValue.trim();
    if (q) window.location.href = `/recherche?q=${encodeURIComponent(q)}`;
  }

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300',
          scrolled || !isHome
            ? 'border-white/[0.07] bg-[#0a0a0b]/90 shadow-lg shadow-black/30 backdrop-blur-xl'
            : 'border-transparent bg-gradient-to-b from-black/70 to-transparent backdrop-blur-md'
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_94%_-20%,rgba(245,158,11,0.14),transparent_42%)]" />

        <div className="relative mx-auto flex h-[68px] max-w-[1480px] items-center gap-3 px-3 sm:h-[76px] sm:px-5 lg:h-[84px] lg:gap-5 lg:px-8">
          {/* Brand */}
          <Brand />

          {/* Center nav (lg+) */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Navigation principale">
            {primaryNav.map(({ label, href, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70',
                    active ? 'bg-white/[0.08] text-white' : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.8} />
                  <span className="hidden xl:inline">{label}</span>
                  <span className="xl:hidden">{label.replace(' en 360°', '')}</span>
                </Link>
              );
            })}
            <Link
              href="/sos-conseil"
              className={cn(
                'ml-1 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70',
                pathname === '/sos-conseil'
                  ? 'border-amber-300 bg-amber-300 text-black shadow-[0_0_22px_rgba(251,191,36,0.4)]'
                  : 'border-amber-300/50 bg-amber-300/[0.06] text-amber-200 hover:border-amber-300 hover:bg-amber-300 hover:text-black'
              )}
            >
              <Sparkles className="size-4 shrink-0" strokeWidth={1.9} />
              SOS Conseil
            </Link>
            <button
              type="button"
              onClick={() => setPartnerOpen(true)}
              className="ml-1 hidden items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-bold whitespace-nowrap text-neutral-200 outline-none transition-all duration-200 hover:border-amber-300/40 hover:bg-amber-300/[0.08] hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70 xl:flex"
            >
              <Store className="size-4 shrink-0" strokeWidth={1.9} />
              Devenir partenaire
            </button>
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:ml-0">
            {/* Search (lg+) */}
            <form onSubmit={(e) => go(e)} className="relative hidden lg:block" role="search">
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Rechercher"
                className="h-11 w-36 rounded-full border border-white/[0.09] bg-white/[0.04] pl-10 pr-4 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all focus:border-amber-300/50 focus:bg-white/[0.07] xl:w-44 xl:focus:w-60"
              />
            </form>

            {/* Cart */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Panier"
              className="group relative flex size-11 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.045] text-neutral-300 outline-none transition-all hover:border-amber-300/40 hover:bg-amber-300/[0.07] hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <ShoppingBag className="size-[18px] transition-transform group-hover:scale-110" strokeWidth={1.8} />
              {!authLoading && totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-1 text-[10px] font-bold text-black shadow-lg shadow-amber-500/30">
                  {totalQuantity > 99 ? '99+' : totalQuantity}
                </span>
              )}
            </button>
            <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

            {/* Auth (lg+) */}
            <div className="ml-1 hidden items-center gap-2 border-l border-white/[0.09] pl-3 lg:flex">
              {authLoading ? (
                <div className="h-10 w-24 rounded-full bg-white/5" aria-hidden />
              ) : user ? (
                <UserMenuDropdown />
              ) : (
                <>
                  <Link href="/login" className="flex h-10 items-center rounded-full px-3.5 text-sm font-semibold text-neutral-300 outline-none transition-all hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300/70">
                    Connexion
                  </Link>
                  <Link href="/register" className="flex h-10 items-center rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 px-4 text-sm font-bold text-black shadow-lg shadow-amber-500/25 outline-none transition-all hover:-translate-y-0.5 hover:shadow-amber-500/40 focus-visible:ring-2 focus-visible:ring-amber-200">
                    S&apos;inscrire
                  </Link>
                </>
              )}
            </div>

            {/* Profile (mobile, logged-in) */}
            {!authLoading && user && (
              <div className="lg:hidden">
                <UserMenuDropdown />
              </div>
            )}

            {/* Hamburger (<lg) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.045] text-neutral-200 outline-none transition-all hover:border-amber-300/40 hover:bg-amber-300/[0.07] hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Premium mobile drawer ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-dvh w-full max-w-[380px] flex-col gap-0 border-white/[0.07] bg-gradient-to-b from-[#0b0b0c] to-black p-0"
        >
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4">
            <Brand onClick={() => setMobileOpen(false)} size="drawer" />
            <SheetClose asChild>
              <button type="button" aria-label="Fermer" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-neutral-300 transition-colors hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            </SheetClose>
          </div>

          {/* Auth CTA (logged-out) */}
          {!authLoading && !user && (
            <div className="grid grid-cols-2 gap-2.5 border-b border-white/[0.06] px-4 py-4">
              <SheetClose asChild>
                <Link href="/login" className="flex h-12 items-center justify-center rounded-xl border border-white/[0.12] text-sm font-semibold text-neutral-200 transition-all hover:bg-white/[0.05] hover:text-white">Connexion</Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/register" className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 text-sm font-bold text-black shadow-lg shadow-amber-500/20">S&apos;inscrire</Link>
              </SheetClose>
            </div>
          )}

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {/* Search */}
            <form onSubmit={(e) => go(e, true)} className="mb-5" role="search">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                <input
                  ref={mobileSearchRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Rechercher un lieu, restaurant…"
                  aria-label="Rechercher"
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-4 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition-all focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
                />
              </div>
            </form>

            {/* SOS Conseil */}
            <SheetClose asChild>
              <Link
                href="/sos-conseil"
                className={cn(
                  'mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold transition-all',
                  pathname === '/sos-conseil'
                    ? 'border-amber-300 bg-amber-300 text-black'
                    : 'border-amber-400/35 bg-gradient-to-r from-amber-400/[0.12] to-transparent text-amber-200 hover:border-amber-400/60'
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Sparkles className="size-5" /></span>
                <span className="flex-1">
                  SOS Conseil
                  <span className="block text-[11px] font-medium text-amber-200/60">Conseil sur mesure</span>
                </span>
                <ChevronRight className="size-4 text-amber-300/60" />
              </Link>
            </SheetClose>

            {/* Devenir partenaire */}
            <button
              type="button"
              onClick={() => { setMobileOpen(false); setPartnerOpen(true); }}
              className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-4 py-3.5 text-left text-sm font-bold text-neutral-200 transition-all hover:border-amber-400/40 hover:text-amber-200"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Store className="size-5" /></span>
              <span className="flex-1">
                Devenir partenaire
                <span className="block text-[11px] font-medium text-neutral-500">Référencez votre établissement</span>
              </span>
              <ChevronRight className="size-4 text-amber-300/60" />
            </button>

            <DrawerSection title="Naviguer" items={primaryNav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <DrawerSection title="Catégories" items={categoryNav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
            <p className="text-center text-[11px] text-neutral-600">
              <span className="font-serif font-bold text-amber-300/80">Look and Book</span> — Book your moment
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Spacer for fixed header on non-home pages */}
      {!isHome && <div className="h-[68px] sm:h-[76px] lg:h-[84px]" />}

      <PartnerApplicationModal open={partnerOpen} onOpenChange={setPartnerOpen} />
    </>
  );
}

function DrawerSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{title}</p>
      <nav className="flex flex-col gap-1">
        {items.map(({ label, href, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <SheetClose key={href} asChild>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'group flex min-h-[52px] items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition-all',
                  active
                    ? 'border-amber-300/30 bg-amber-300/[0.08] text-amber-100'
                    : 'border-transparent text-neutral-300 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white'
                )}
              >
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors', active ? 'bg-amber-300/15 text-amber-300' : 'bg-white/[0.05] text-neutral-400 group-hover:text-amber-200')}>
                  <Icon className="size-4" />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRight className={cn('size-4 transition-all', active ? 'text-amber-300/70' : 'text-neutral-600 group-hover:translate-x-0.5 group-hover:text-amber-300')} />
              </Link>
            </SheetClose>
          );
        })}
      </nav>
    </div>
  );
}
