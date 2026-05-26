'use client';

import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCartStore } from '@/stores/cart';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';

const navigationItems = [
  { label: 'Explorer en 360°', href: '/explorer', icon: Compass },
  { label: 'Coworking', href: '/coworking', icon: BriefcaseBusiness },
  { label: 'Événements', href: '/evenements', icon: CalendarDays },
];

export function HomeNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const { user, isLoading: authLoading } = useAuth();
  const totalQuantity = useCartStore((s) => s.totalQuantity());

  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    if (searchFocused) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchFocused]);

  // Focus mobile search when sheet opens
  useEffect(() => {
    if (mobileOpen) setTimeout(() => mobileSearchRef.current?.focus(), 300);
  }, [mobileOpen]);

  const bgClass = isHome
    ? scrolled
      ? 'bg-[#050504]/95 shadow-lg shadow-black/35'
      : 'bg-[#050504]/82'
    : 'bg-[#050504]/96 shadow-sm shadow-black/10';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      window.location.href = `/recherche?q=${encodeURIComponent(searchValue.trim())}`;
    }
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    if (searchValue.trim()) {
      window.location.href = `/recherche?q=${encodeURIComponent(searchValue.trim())}`;
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b border-amber-300/[0.08] backdrop-blur-2xl transition-all duration-500',
          bgClass
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(245,158,11,0.16),transparent_28%),linear-gradient(90deg,rgba(245,158,11,0.08),transparent_35%,rgba(255,255,255,0.03))]" aria-hidden />
        <div className="relative mx-auto flex h-[76px] sm:h-[84px] lg:h-[88px] max-w-[1440px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex min-h-12 shrink-0 items-center rounded-xl px-1 py-1 outline-none transition-all duration-300 hover:scale-[1.015] focus-visible:ring-2 focus-visible:ring-amber-300/70"
          >
            <Image
              src="/logo-transparent.png"
              alt="Ma Reservation"
              width={540}
              height={152}
              className="h-[42px] w-auto object-contain drop-shadow-[0_8px_18px_rgba(212,175,55,0.22)] transition-transform duration-300 sm:h-[48px] lg:h-[52px]"
              style={{ width: 'auto' }}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden min-h-12 shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] xl:flex">
            {navigationItems.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '?');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex min-h-10 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70',
                    isActive
                      ? 'bg-amber-300 text-black shadow-[0_8px_22px_rgba(245,158,11,0.22)]'
                      : 'text-neutral-300 hover:bg-white/[0.07] hover:text-white'
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.8} />
                  {link.label}
                </Link>
              );
            })}

            {/* SOS Conseil pill */}
            <Link
              href="/sos-conseil"
              className={cn(
                'ml-1 flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70',
                pathname === '/sos-conseil'
                  ? 'border-amber-300 bg-amber-300 text-black shadow-[0_0_24px_rgba(251,191,36,0.42)]'
                  : 'border-amber-300/55 bg-amber-300/[0.06] text-amber-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-300 hover:text-black hover:shadow-[0_14px_26px_rgba(245,158,11,0.22)]'
              )}
            >
              <Sparkles className="size-4 shrink-0" strokeWidth={1.9} />
              SOS Conseil
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search bar — desktop */}
            <form onSubmit={handleSearch} className="hidden xl:block relative shrink-0">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500 transition-colors" style={{ pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Rechercher..."
                className={cn(
                  'h-12 w-[220px] rounded-2xl border bg-white/[0.045] pl-11 pr-4 text-sm font-medium text-neutral-100 placeholder:text-neutral-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 focus:outline-none 2xl:w-[360px]',
                  searchFocused
                    ? 'border-amber-300/55 bg-white/[0.08] shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_0_26px_rgba(245,158,11,0.12)]'
                    : 'border-white/[0.09] hover:border-white/[0.16] hover:bg-white/[0.06]'
                )}
              />
            </form>

            {/* Cart — Premium luxury circular button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.045] text-neutral-300 outline-none transition-all duration-300 hover:border-amber-300/40 hover:bg-amber-300/[0.07] hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70"
              aria-label="Panier"
            >
              <ShoppingBag className="size-4 sm:size-5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.8} />
              {/* Premium badge */}
              {!authLoading && totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-4.5 sm:h-5 px-1 sm:px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[9px] sm:text-[10px] font-bold text-black shadow-lg shadow-amber-500/30">
                  {totalQuantity > 99 ? '99+' : totalQuantity}
                </span>
              )}
            </button>

            <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

            {/* Auth — desktop only (xl+) */}
            <div className="ml-1 hidden min-h-12 items-center gap-2 border-l border-white/[0.09] pl-3 xl:flex">
              {authLoading ? (
                <div className="h-10 w-[140px] rounded-xl bg-white/5" aria-hidden />
              ) : user ? (
                <UserMenuDropdown />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex min-h-11 items-center rounded-xl border border-white/[0.09] px-4 py-2 text-[13px] font-semibold text-neutral-300 outline-none transition-all duration-200 hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300/70"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="group relative flex min-h-11 items-center rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 px-5 py-2 text-[13px] font-bold text-black shadow-lg shadow-amber-500/25 outline-none transition-all duration-300 hover:-translate-y-0.5 hover:from-amber-200 hover:via-amber-300 hover:to-amber-200 hover:shadow-amber-500/40 focus-visible:ring-2 focus-visible:ring-amber-200"
                  >
                    S&apos;inscrire
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger — fully circular, visible below xl */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.045] text-neutral-300 outline-none transition-all hover:border-amber-300/40 hover:bg-amber-300/[0.07] hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70 xl:hidden"
                  aria-label="Menu"
                  suppressHydrationWarning
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[300px] flex-col border-white/[0.08] bg-[#050504] p-0 sm:w-[400px]">
                <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
                  <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                  <Link href="/" onClick={() => setMobileOpen(false)} className="inline-block rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70">
                    <Image
                      src="/logo-transparent.png"
                      alt="Ma Reservation"
                      width={420}
                      height={120}
                      className="h-[40px] w-auto object-contain sm:h-[45px] drop-shadow-[0_6px_20px_rgba(212,175,55,0.3)]"
                    />
                  </Link>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {/* Mobile search */}
                  <form onSubmit={handleMobileSearch} className="mb-5">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500" style={{ pointerEvents: 'none' }} />
                      <input
                        ref={mobileSearchRef}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Rechercher un lieu, restaurant..."
                        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 outline-none transition-all focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>
                  </form>

                  {/* Nav links */}
                  <nav className="flex flex-col gap-1.5 mb-5">
                    {navigationItems.map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href || pathname.startsWith(link.href + '?');
                      return (
                        <SheetClose key={link.href} asChild>
                          <Link
                            href={link.href}
                            className={cn(
                              'flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70',
                              isActive
                                ? 'bg-amber-300 text-black'
                                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                            )}
                          >
                            <Icon className="size-4" />
                            {link.label}
                          </Link>
                        </SheetClose>
                      );
                    })}

                    {/* SOS Conseil */}
                    <SheetClose asChild>
                      <Link
                        href="/sos-conseil"
                        className={cn(
                          'flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70',
                          pathname === '/sos-conseil'
                            ? 'border-amber-300 bg-amber-300 text-black'
                            : 'border-amber-400/40 bg-amber-300/[0.05] text-amber-300 hover:border-amber-400 hover:bg-amber-400/10'
                        )}
                      >
                        <Sparkles className="size-4 shrink-0" />
                        SOS Conseil
                      </Link>
                    </SheetClose>
                  </nav>
                </div>

                {/* Auth section — bottom of sheet */}
                <div className="border-t border-white/[0.06] px-5 py-4">
                  {authLoading ? (
                    <div className="h-24 rounded-xl bg-white/5" aria-hidden />
                  ) : user ? (
                    <UserMenuDropdown />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <SheetClose asChild>
                        <Link
                          href="/login"
                          className="block min-h-12 rounded-xl border border-white/[0.12] px-4 py-3 text-center text-sm font-semibold text-neutral-300 outline-none transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300/70"
                        >
                          Connexion
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/register"
                          className="block min-h-12 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 px-4 py-3 text-center text-sm font-bold text-black shadow-lg shadow-amber-500/25 outline-none transition-all duration-300 hover:from-amber-200 hover:via-amber-300 hover:to-amber-200 focus-visible:ring-2 focus-visible:ring-amber-200"
                        >
                          Créer un compte
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header on non-home pages */}
      {!isHome && <div className="h-[76px] sm:h-[84px] xl:h-[88px]" />}

    </>
  );
}
