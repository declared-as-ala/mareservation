'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarDays,
  Settings,
  Tags,
  FolderTree,
  Image as ImageIcon,
  BookOpen,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Bell,
  Star,
  Sparkles,
  QrCode,
  Layers,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/admin/users', label: 'Utilisateurs', icon: Users },
      { href: '/admin/venues', label: 'Lieux', icon: MapPin },
      { href: '/admin/events', label: 'Événements', icon: CalendarDays },
      { href: '/admin/reservations', label: 'Réservations', icon: BookOpen },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { href: '/admin/categories', label: 'Catégories', icon: FolderTree },
      { href: '/admin/tags', label: 'Tags', icon: Tags },
      { href: '/admin/banner-slides', label: 'Bannières', icon: ImageIcon },
      { href: '/admin/vedette', label: 'Vedette', icon: Star },
      { href: '/admin/scenes', label: 'Scènes 360°', icon: Layers },
    ],
  },
  {
    label: 'Conciergerie',
    items: [
      { href: '/admin/sos-conseil', label: 'SOS Conseil', icon: Sparkles },
      { href: '/admin/scanner', label: 'Scanner QR', icon: QrCode },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/admin/settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/60">
        <div className="flex-1 min-w-0">
          <Image
            src="/logo.png"
            alt="Ma Table"
            width={400}
            height={110}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#D4AF37]/10 px-2.5 py-1 border border-[#D4AF37]/20 shrink-0">
          <ShieldCheck className="size-3 text-[#D4AF37]" />
          <span className="text-[10px] text-[#D4AF37] font-semibold whitespace-nowrap">Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 group',
                      isActive
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    )}
                  >
                    <Icon className={cn(
                      'size-4 shrink-0 transition-colors duration-150',
                      isActive ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    )} />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1 h-3.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user panel */}
      <div className="border-t border-zinc-800 p-3 space-y-1">
        <Link
          href="/"
          target="_blank"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-amber-400 hover:bg-amber-400/5 transition-all duration-150"
        >
          <ExternalLink className="size-3.5" />
          Voir le site
        </Link>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700/60">
            <div className="size-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[11px] font-bold text-black shrink-0">
              {(user.fullName ?? user.email ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-100 truncate">{user.fullName ?? user.email}</p>
              <p className="text-[10px] text-zinc-500">Administrateur</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Redirect non-ADMIN once auth is resolved.
  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/unauthorized');
    }
  }, [isLoading, user, router]);

  // Close mobile menu on route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Show loading while AuthProvider is validating.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Ma Table" width={400} height={110} className="h-16 w-auto object-contain" />
          <p className="text-sm text-zinc-500">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  // Safety net: no user after resolution.
  if (!user || user.role !== 'ADMIN') return null;

  const allItems = navGroups.flatMap((g) => g.items);
  const currentItem = allItems.find((i) =>
    i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + '/')
  );
  const pageTitle = currentItem?.label ?? 'Administration';

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col bg-zinc-950 border-r border-zinc-800">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col bg-zinc-950 border-r border-zinc-800 lg:hidden">
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-150"
              aria-label="Ouvrir le menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
              <span className="text-zinc-500 hidden sm:inline text-xs font-medium tracking-wide">Admin</span>
              <ChevronRight className="size-3.5 text-zinc-700 hidden sm:inline" />
              <span className="font-semibold text-zinc-100 text-sm">{pageTitle}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-150"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 bg-[#D4AF37] rounded-full" />
            </button>
            <div className="hidden sm:block h-5 w-px bg-zinc-800" />
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber-400/5"
            >
              <ExternalLink className="size-3.5" />
              Voir le site
            </Link>
            <div className="hidden sm:block h-5 w-px bg-zinc-800" />
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] font-bold text-black">
                {(user.fullName ?? user.email ?? 'A').charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <span className="text-xs font-medium text-zinc-100 block truncate max-w-[120px]">
                  {user.fullName ?? user.email}
                </span>
                <span className="text-[10px] text-zinc-500">Administrateur</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-zinc-950 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
