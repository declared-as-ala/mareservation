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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCartStore } from '@/stores/cart';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';

const categories = [
  { label: 'Explorer en 360°', href: '/explorer', icon: Compass },
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
      ? 'bg-black/95 shadow-lg shadow-black/30'
      : 'bg-black/75'
    : 'bg-black/95 shadow-sm shadow-black/10';

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
          'fixed inset-x-0 top-0 z-50 backdrop-blur-xl border-b border-white/[0.06] transition-all duration-500',
          bgClass
        )}
      >
        <div className="mx-auto flex h-[82px] sm:h-[92px] lg:h-[106px] max-w-[1440px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 rounded-xl bg-white/[0.06] px-2.5 py-1.5 ring-1 ring-white/[0.12]">
            <Image
              src="/logo.png"
              alt="Ma Reservation"
              width={540}
              height={152}
              className="h-[42px] w-auto object-contain drop-shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition-transform duration-300 hover:scale-[1.02] sm:h-[50px] lg:h-[58px]"
              style={{ width: 'auto' }}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-1 shrink-0">
            {categories.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '?');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-sm lg:text-[14px] font-medium whitespace-nowrap transition-all duration-200',
                    isActive
                      ? 'text-amber-300 bg-amber-400/10'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {link.label}
                </Link>
              );
            })}

            {/* SOS Conseil pill */}
            <Link
              href="/sos-conseil"
              className={cn(
                'flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-full text-sm lg:text-[14px] font-semibold whitespace-nowrap transition-all duration-200 border',
                pathname === '/sos-conseil'
                  ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  : 'border-amber-400/50 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400 hover:text-amber-200'
              )}
            >
              <Sparkles className="size-3.5 lg:size-4 shrink-0" />
              SOS Conseil
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search bar — desktop */}
            <form onSubmit={handleSearch} className="hidden xl:block relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors" style={{ pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Rechercher..."
                className={cn(
                  'h-10 lg:h-12 w-[200px] 2xl:w-[340px] rounded-xl border bg-white/[0.04] pl-10 lg:pl-11 pr-3 lg:pr-4 text-sm text-neutral-100 placeholder:text-neutral-600 transition-all duration-300 focus:outline-none',
                  searchFocused
                    ? 'border-amber-400/50 bg-white/[0.08] shadow-[0_0_24px_rgba(251,191,36,0.15)]'
                    : 'border-white/[0.08] hover:border-white/[0.12]'
                )}
              />
            </form>

            {/* Cart — Premium luxury button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="group relative flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl border border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:text-amber-300 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all duration-300 shrink-0"
              aria-label="Panier"
            >
              <ShoppingBag className="size-4 sm:size-5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
              {/* Premium badge */}
              {!authLoading && totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-4.5 sm:h-5 px-1 sm:px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[9px] sm:text-[10px] font-bold text-black shadow-lg shadow-amber-500/30">
                  {totalQuantity > 99 ? '99+' : totalQuantity}
                </span>
              )}
            </button>

            <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

            {/* Mobile: Se connecter — in header bar (guests only) */}
            {!authLoading && !user && (
              <Link
                href="/login"
                className="xl:hidden shrink-0 rounded-xl border border-white/[0.14] bg-white/[0.04] px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-semibold text-neutral-100 hover:border-amber-400/45 hover:bg-amber-400/10 hover:text-amber-200 transition-all duration-200 whitespace-nowrap"
              >
                Se connecter
              </Link>
            )}

            {/* Auth — desktop only (xl+) */}
            <div className="hidden xl:flex items-center gap-2 ml-1 pl-2 border-l border-white/[0.08]">
              {authLoading ? (
                <div className="h-10 w-[140px] rounded-xl bg-white/5" aria-hidden />
              ) : user ? (
                <UserMenuDropdown />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-[13px] font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 whitespace-nowrap"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="group relative px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black text-xs lg:text-[13px] font-semibold hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 whitespace-nowrap"
                  >
                    S&apos;inscrire
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger — visible below xl */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-all xl:hidden shrink-0"
                  aria-label="Menu"
                  suppressHydrationWarning
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-black border-white/[0.08] p-0 flex flex-col">
                <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
                  <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                  <Link href="/" onClick={() => setMobileOpen(false)} className="inline-block rounded-xl bg-white/[0.04] px-2 py-1 ring-1 ring-white/[0.08]">
                    <Image
                      src="/logo.png"
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
                        className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                      />
                    </div>
                  </form>

                  {/* Nav links */}
                  <nav className="flex flex-col gap-1.5 mb-5">
                    {categories.map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href || pathname.startsWith(link.href + '?');
                      return (
                        <SheetClose key={link.href} asChild>
                          <Link
                            href={link.href}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                              isActive
                                ? 'text-amber-300 bg-amber-400/10'
                                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                            )}
                          >
                            <Icon className="size-4 opacity-80" />
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
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border',
                          pathname === '/sos-conseil'
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400'
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
                          className="block text-center px-4 py-3 rounded-xl border border-white/[0.12] text-sm font-medium text-neutral-300 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.05] transition-all duration-200"
                        >
                          Connexion
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/register"
                          className="block text-center px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black text-sm font-semibold hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 transition-all duration-300 shadow-lg shadow-amber-500/25"
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
      {!isHome && <div className="h-[82px] sm:h-[92px] xl:h-[106px]" />}

    </>
  );
}
