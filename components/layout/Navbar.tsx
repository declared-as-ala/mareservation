'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/stores/cart';
import { useAuth } from '@/components/auth/AuthProvider';
import { GlobalSearchBar } from './GlobalSearchBar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenuDropdown } from './UserMenuDropdown';
import { CartDrawer } from './CartDrawer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { isOwnerRole } from '@/lib/auth/redirect';

const categories = [
  { name: 'Explorer les lieux', href: '/explorer' },
  { name: 'Carte', href: '/carte' },
  { name: 'Événements', href: '/evenements' },
];

export function Navbar() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = isOwnerRole(user?.role);
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const pathname = usePathname();
  const cartOpen = useCartStore((s) => s.drawerOpen);
  const openCart = useCartStore((s) => s.openDrawer);
  const closeCart = useCartStore((s) => s.closeDrawer);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/90">
      <div className="container flex h-[80px] sm:h-[90px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0 rounded-xl bg-white/[0.06] px-2.5 py-1.5 ring-1 ring-white/[0.12]">
          <Image
            src="/logo.png"
            alt="Before you go"
            width={520}
            height={150}
            className="h-[60px] w-auto object-contain sm:h-[70px] lg:h-[76px] drop-shadow-[0_6px_20px_rgba(212,175,55,0.32)]"
            style={{ width: 'auto' }}
            priority
          />
        </Link>

        {/* Desktop nav — visible on xl+ */}
        <nav className="hidden xl:flex items-center gap-1">
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={cn(
                'px-3 lg:px-4 py-2 text-sm font-medium transition-colors hover:text-amber-400 whitespace-nowrap',
                pathname === cat.href ? 'text-amber-400' : 'text-zinc-400'
              )}
            >
              {cat.name}
            </Link>
          ))}
          {/* SOS Conseil */}
          <Link
            href="/sos-conseil"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border',
              pathname === '/sos-conseil'
                ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-md'
                : 'border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]'
            )}
          >
            <Sparkles className="size-3.5 shrink-0" />
            SOS Conseil
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Search toggle — hidden on xl (search always visible in xl nav) */}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Recherche"
          >
            <Search className="size-4" />
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => openCart()}
            aria-label="Panier"
          >
            <ShoppingBag className="size-4 sm:size-5" />
            {totalQuantity > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-medium text-white">
                {totalQuantity > 99 ? '99+' : totalQuantity}
              </span>
            )}
          </Button>
          <CartDrawer open={cartOpen} onOpenChange={(v) => (v ? openCart() : closeCart())} />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Mobile: Se connecter — visible in bar (xl+ uses desktop block below) */}
          {!authLoading && !isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="xl:hidden h-9 shrink-0 border-zinc-600 bg-zinc-900/50 px-2.5 text-xs font-semibold text-zinc-100 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-300"
            >
              <Link href="/login">Se connecter</Link>
            </Button>
          )}

          {/* Auth — desktop (xl+) */}
          <div className="hidden xl:flex items-center gap-2 ml-1 pl-2 border-l border-zinc-800">
            {authLoading ? (
              <>
                <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-800/70" />
                <div className="h-9 w-28 animate-pulse rounded-md bg-zinc-800/70" />
              </>
            ) : isAuthenticated && user ? (
              <UserMenuDropdown />
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button size="sm" asChild className="bg-[#D4AF37] hover:bg-[#B8962E] text-white">
                  <Link href="/register">Inscription</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu trigger — visible below xl */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden h-9 w-9 sm:h-10 sm:w-10" aria-label="Menu">
                <Menu className="size-4 sm:size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col bg-zinc-950 border-zinc-800">
              <SheetHeader className="px-5 pt-5 pb-4 border-b border-zinc-800">
                <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                <Link href="/" onClick={() => setMobileOpen(false)} className="inline-block rounded-xl bg-white/[0.04] px-2 py-1 ring-1 ring-white/[0.08]">
                  <Image
                    src="/logo.png"
                    alt="Before you go"
                    width={420}
                    height={120}
                    className="h-[52px] w-auto object-contain sm:h-[58px] drop-shadow-[0_6px_18px_rgba(212,175,55,0.3)]"
                    style={{ width: 'auto' }}
                  />
                </Link>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Search */}
                <div className="mb-5">
                  <GlobalSearchBar />
                </div>

                {/* Nav links */}
                <nav className="flex flex-col gap-1.5 mb-5">
                  {categories.map((cat) => (
                    <SheetClose key={cat.href} asChild>
                      <Link
                        href={cat.href}
                        className={cn(
                          'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          pathname === cat.href
                            ? 'bg-amber-400/10 text-amber-400'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                        )}
                      >
                        {cat.name}
                      </Link>
                    </SheetClose>
                  ))}

                  {/* SOS Conseil */}
                  <SheetClose asChild>
                    <Link
                      href="/sos-conseil"
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 border',
                        pathname === '/sos-conseil'
                          ? 'bg-[#D4AF37] text-white border-[#D4AF37]'
                          : 'border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10'
                      )}
                    >
                      <Sparkles className="size-4 shrink-0" />
                      SOS Conseil
                    </Link>
                  </SheetClose>
                </nav>
              </div>

              {/* Auth — bottom of sheet */}
              <div className="border-t border-zinc-800 px-5 py-4">
                {authLoading ? (
                  <div className="space-y-2">
                    <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-800/70" />
                    <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-800/70" />
                  </div>
                ) : isAuthenticated && user ? (
                  <div className="flex flex-col gap-2">
                    {isAdmin ? (
                      <SheetClose asChild>
                        <Link
                          href="/admin/dashboard"
                          className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                          Tableau de bord
                        </Link>
                      </SheetClose>
                    ) : isOwner ? (
                      <SheetClose asChild>
                        <Link
                          href="/owner"
                          className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                          Espace proprietaire
                        </Link>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <Link
                          href="/mes-reservations"
                          className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                          Mes réservations
                        </Link>
                      </SheetClose>
                    )}
                    <SheetClose asChild>
                      <Link
                        href={isAdmin ? '/admin/settings' : '/profile'}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                      >
                        Mon profil
                      </Link>
                    </SheetClose>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <SheetClose asChild>
                      <Link
                        href="/login"
                        className="block text-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors border border-zinc-700"
                      >
                        Connexion
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/register"
                        className="block text-center rounded-lg px-3 py-2.5 text-sm font-medium bg-amber-400 text-zinc-950 hover:bg-amber-300"
                      >
                        Inscription
                      </Link>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Expandable search bar below header */}
      {searchOpen && (
        <div className="border-t border-zinc-800 px-3 sm:px-4 py-3">
          <GlobalSearchBar />
        </div>
      )}
    </header>
  );
}
