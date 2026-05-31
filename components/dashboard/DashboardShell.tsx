'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, ExternalLink, LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface DashboardShellProps {
  /** "Espace Propriétaire" | "Administration" */
  brand: string;
  /** Link the brand points to (dashboard home). */
  homeHref: string;
  nav: NavGroup[];
  children: ReactNode;
  /** Signed-in user shown in the bottom panel. */
  user?: { name?: string; email?: string; role?: string } | null;
  /** Logout handler — renders a logout button when provided. */
  onLogout?: () => void;
}

/**
 * Config-driven dashboard shell — collapsible grouped sidebar + sticky topbar
 * + bottom user panel with logout. One shell for the owner and admin areas.
 */
export function DashboardShell({
  brand,
  homeHref,
  nav,
  children,
  user,
  onLogout,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== homeHref && pathname.startsWith(href));

  const initial = (user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link
        href={homeHref}
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-4"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-black text-black">
          B
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">Before you go</div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400/80">{brand}</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {nav.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && (
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-all',
                      active
                        ? 'bg-amber-400/10 text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.15)]'
                        : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100'
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active ? 'text-amber-400' : 'text-neutral-500')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom panel */}
      <div className="space-y-1 border-t border-white/[0.06] p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-amber-300"
        >
          <ExternalLink className="size-3.5" />
          Voir le site
        </Link>
        {user && (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-bold text-black">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-neutral-100">{user.name ?? user.email}</p>
              {user.role && <p className="text-[10px] text-neutral-500">{user.role}</p>}
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="flex size-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/[0.06] bg-[#0B0B0C] lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.24 }}
              className="absolute inset-y-0 left-0 w-64 border-r border-white/[0.06] bg-[#0B0B0C]"
            >
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#080808]/90 px-4 backdrop-blur-xl lg:pl-[15.75rem]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-neutral-300 lg:hidden"
        >
          <Menu className="size-4.5" />
        </button>
        <span className="text-sm font-semibold text-neutral-300">{brand}</span>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:border-red-500/30 hover:text-red-400"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        )}
      </header>

      {/* Content */}
      <main className="px-4 py-6 lg:pl-[15.75rem]">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
