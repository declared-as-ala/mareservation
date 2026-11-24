'use client';

/**
 * Super-admin shell — light premium SaaS. Guesthouse business only:
 * Vue d'ensemble · Réservations · Maisons d'hôtes · Gestion · Administration.
 * Legacy marketplace sections are retired (redirected in middleware.ts), not deleted.
 */
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock, CalendarDays, ChevronsLeft, ChevronsRight, ClipboardList, ExternalLink, Home, Inbox, LayoutDashboard,
  LogOut, Menu, Settings, UserCheck, Users, X,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import { fetchApplications, fetchReservations } from '@/lib/api/admin-console';
import { cn } from '@/lib/utils';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (p: string, sp: URLSearchParams) => boolean; badge?: 'pending' | 'applications' };
const NAV: { label: string; items: Item[] }[] = [
  { label: 'Vue d’ensemble', items: [{ href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, match: (p) => p === '/admin/dashboard' || p === '/admin' }] },
  {
    label: 'Réservations',
    items: [
      { href: '/admin/reservations', label: 'Toutes les réservations', icon: ClipboardList, match: (p, sp) => p === '/admin/reservations' && sp.get('status') !== 'pending' },
      { href: '/admin/reservations?status=pending', label: 'À confirmer', icon: CalendarClock, match: (p, sp) => p === '/admin/reservations' && sp.get('status') === 'pending', badge: 'pending' },
      { href: '/admin/reservations/calendar', label: 'Calendrier des séjours', icon: CalendarDays, match: (p) => p.startsWith('/admin/reservations/calendar') },
    ],
  },
  {
    label: 'Maisons d’hôtes',
    items: [
      { href: '/admin/guesthouses', label: 'Établissements', icon: Home, match: (p) => p.startsWith('/admin/guesthouses') },
      { href: '/admin/applications', label: 'Demandes d’adhésion', icon: Inbox, match: (p) => p.startsWith('/admin/applications'), badge: 'applications' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/admin/owners', label: 'Propriétaires', icon: UserCheck, match: (p) => p.startsWith('/admin/owners') },
      { href: '/admin/customers', label: 'Clients', icon: Users, match: (p) => p.startsWith('/admin/customers') },
    ],
  },
  { label: 'Administration', items: [{ href: '/admin/settings', label: 'Paramètres', icon: Settings, match: (p) => p.startsWith('/admin/settings') }] },
];

const COLLAPSE_KEY = 'ex-admin-sidebar-collapsed';

function Wordmark({ compact }: { compact?: boolean }) {
  return compact ? (
    <span className="grid size-8 place-items-center rounded-lg bg-[#171717] text-[11px] font-bold text-[#E0B24A]">360</span>
  ) : (
    <span className="text-[15px] font-bold tracking-[-0.01em] text-[#171717]">
      EXPLORIA <span className="text-[#8A6514]">360</span>
    </span>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname() ?? '';
  const sp = useSearchParams();
  const params = new URLSearchParams(sp?.toString() ?? '');
  const { data: pending } = useQuery({ queryKey: ['admin-nav', 'pending'], queryFn: () => fetchReservations({ status: 'pending', limit: 5 }), refetchInterval: 60_000, staleTime: 30_000 });
  const { data: apps } = useQuery({ queryKey: ['admin-nav', 'applications'], queryFn: () => fetchApplications('open'), refetchInterval: 120_000, staleTime: 60_000 });
  const badges = { pending: pending?.total ?? 0, applications: (apps?.counts.new ?? 0) + (apps?.counts.in_review ?? 0) };

  return (
    <nav aria-label="Navigation administrateur" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((group) => (
        <div key={group.label}>
          {collapsed ? <div className="mx-2 mb-2 h-px bg-[#E7E4DD]" aria-hidden="true" /> : (
            <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#9A968D]">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.match(pathname, params);
              const Icon = item.icon;
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      active ? 'bg-[#F7F1E3] text-[#171717]' : 'text-[#4A4740] hover:bg-[#F1EFEA] hover:text-[#171717]'
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#C99628]" aria-hidden="true" />}
                    <Icon className={cn('size-[17px] shrink-0', active ? 'text-[#8A6514]' : 'text-[#8A867E] group-hover:text-[#4A4740]')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {count > 0 && (
                      <span className={cn('rounded-full bg-[#C99628] text-[10.5px] font-bold tabular-nums text-[#171717]', collapsed ? 'absolute right-1 top-0.5 min-w-4 px-1 text-center leading-4' : 'ml-auto px-1.5 py-px')}>
                        {count > 99 ? '99+' : count}
                        <span className="sr-only"> en attente</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const initials = (user?.fullName ?? user?.email ?? 'A').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="border-t border-[#E7E4DD] p-3">
      <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col')}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#171717] text-[11px] font-bold text-[#FFFFFF]" aria-hidden="true">{initials}</span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-[#171717]">{user?.fullName}</p>
            <p className="truncate text-[11px] text-[#8A867E]">Super administrateur</p>
          </div>
        )}
        <button
          type="button"
          onClick={async () => { await logout(); router.replace('/login'); }}
          className="grid size-8 place-items-center rounded-lg text-[#6B6760] hover:bg-[#F1EFEA] hover:text-[#171717]"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Auth guard (unchanged behaviour): login for guests, /unauthorized for non-admins.
  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace(`/login?returnTo=${encodeURIComponent(pathname || '/admin/dashboard')}`);
    else if (user.role !== 'ADMIN') router.replace('/unauthorized');
  }, [isLoading, user, router, pathname]);

  // Light theme for the console and for portalled drawers/dialogs (they render under <body>).
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add('theme-light', 'admin-light');
    return () => el.classList.remove('theme-light', 'admin-light');
  }, []);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* storage unavailable */ }
  }, []);
  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
    return !c;
  });

  useEffect(() => setMobileOpen(false), [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4]">
        <div className="flex flex-col items-center gap-3">
          <Wordmark />
          <p className="text-[13px] text-[#6B6760]">Vérification des droits…</p>
        </div>
      </div>
    );
  }
  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#171717]">
      <a href="#admin-main" className="sr-only z-50 rounded-md bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Aller au contenu</a>

      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[#E7E4DD] bg-white transition-[width] duration-200 lg:flex', collapsed ? 'w-[68px]' : 'w-[248px]')}>
        <div className={cn('flex h-14 items-center border-b border-[#E7E4DD]', collapsed ? 'justify-center' : 'justify-between px-4')}>
          <Link href="/admin/dashboard" aria-label="Exploria360 — tableau de bord"><Wordmark compact={collapsed} /></Link>
          {!collapsed && <span className="rounded-md bg-[#F7F1E3] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8A6514]">Admin</span>}
        </div>
        <Suspense fallback={<div className="flex-1" />}>
          <SidebarNav collapsed={collapsed} />
        </Suspense>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="mx-3 mb-2 flex h-8 items-center justify-center gap-2 rounded-lg text-[12px] font-medium text-[#6B6760] hover:bg-[#F1EFEA]"
          aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Replier</>}
        </button>
        <UserBlock collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu administrateur">
          <button type="button" className="absolute inset-0 bg-[#171717]/40" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[#E7E4DD] px-4">
              <Wordmark />
              <button type="button" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-lg text-[#4A4740] hover:bg-[#F1EFEA]" aria-label="Fermer le menu">
                <X className="size-5" />
              </button>
            </div>
            <Suspense fallback={<div className="flex-1" />}>
              <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </Suspense>
            <UserBlock collapsed={false} />
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#E7E4DD] bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg text-[#4A4740] hover:bg-[#F1EFEA] lg:hidden" aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden"><Wordmark /></div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#4A4740] hover:bg-[#F1EFEA] sm:inline-flex">
              Voir le site <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
