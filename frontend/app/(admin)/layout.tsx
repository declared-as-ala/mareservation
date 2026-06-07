'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  Tags,
  FolderTree,
  Image as ImageIcon,
  BookOpen,
  ChevronRight,
  ChevronDown,
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
  UtensilsCrossed,
  Coffee,
  Wine,
  Utensils,
  BriefcaseBusiness,
  Music2,
  Hotel as HotelIcon,
  Home as HomeIcon,
  Waves,
  Flower2,
  PartyPopper,
  CircleDollarSign,
  HeadphonesIcon,
  UserCheck,
  ShieldAlert,
  Trophy,
  Martini,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  typeQuery?: string;
  qQuery?: string;
};

type CategoryNode = {
  key: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Where the category itself navigates if there are no children. */
  href?: string;
  /** Sub-items shown when the user expands the category. */
  children?: NavItem[];
};

type NavGroup = { label: string; items: NavItem[] };
type CategoryGroup = { label: string; categories: CategoryNode[] };

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
    ],
  },
];

const categoryGroup: CategoryGroup = {
  label: 'Catégories',
  categories: [
    {
      key: 'hebergement',
      label: 'Hébergement',
      subtitle: "Hôtels • Maisons d'hôtes",
      icon: HotelIcon,
      children: [
        { href: '/admin/hotels', label: 'Hôtels', icon: HotelIcon },
        { href: '/admin/maisons-dhote', label: "Maisons d'hôtes", icon: HomeIcon },
      ],
    },
    {
      key: 'restauration',
      label: 'Restauration',
      subtitle: 'Restaurants • Cafés',
      icon: Utensils,
      children: [
        { href: '/admin/venues?type=RESTAURANT', label: 'Restaurants', icon: Utensils, typeQuery: 'RESTAURANT' },
        { href: '/admin/venues?type=CAFE', label: 'Cafés', icon: Coffee, typeQuery: 'CAFE' },
      ],
    },
    {
      key: 'sorties',
      label: 'Sorties',
      subtitle: 'Bars • Rooftops • Clubs',
      icon: Martini,
      children: [
        { href: '/admin/venues?q=Bar', label: 'Bars', icon: Wine, qQuery: 'Bar' },
        { href: '/admin/venues?q=Rooftop', label: 'Rooftops', icon: Martini, qQuery: 'Rooftop' },
        { href: '/admin/venues?q=Club', label: 'Clubs', icon: Music2, qQuery: 'Club' },
        { href: '/admin/venues?q=Beach', label: 'Beach Clubs', icon: Waves, qQuery: 'Beach' },
      ],
    },
    {
      key: 'evenements',
      label: 'Événements',
      subtitle: 'Concerts • Festivals',
      icon: PartyPopper,
      children: [
        { href: '/admin/events?type=CONCERT', label: 'Concerts', icon: PartyPopper, typeQuery: 'CONCERT' },
        { href: '/admin/events?type=FESTIVAL', label: 'Festivals', icon: Sparkles, typeQuery: 'FESTIVAL' },
        { href: '/admin/events', label: 'Tous les événements', icon: CalendarDays },
      ],
    },
    {
      key: 'sport',
      label: 'Sport',
      subtitle: 'Matchs • Tournois',
      icon: Trophy,
      children: [
        { href: '/admin/events?type=SPORT', label: 'Matchs', icon: Trophy, typeQuery: 'SPORT' },
        { href: '/admin/events?type=TOURNOI', label: 'Tournois', icon: Trophy, typeQuery: 'TOURNOI' },
      ],
    },
    {
      key: 'business',
      label: 'Business',
      subtitle: 'Réunions • Coworking',
      icon: BriefcaseBusiness,
      children: [
        { href: '/admin/venues?type=COWORKING', label: 'Coworking', icon: BriefcaseBusiness, typeQuery: 'COWORKING' },
        { href: '/admin/venues?q=Reunion', label: 'Salles de réunion', icon: Users, qQuery: 'Reunion' },
      ],
    },
    {
      key: 'bien-etre',
      label: 'Bien-être',
      subtitle: 'Spas • Centres',
      icon: Flower2,
      href: '/admin/venues?q=Spa',
    },
  ],
};

const tailNavGroups: NavGroup[] = [
  {
    label: 'Gestion',
    items: [
      { href: '/admin/users', label: 'Utilisateurs', icon: Users },
      { href: '/admin/reservations', label: 'Réservations', icon: BookOpen },
      { href: '/admin/hotels-approval', label: 'Approbation hôtels', icon: ShieldCheck },
      { href: '/admin/owners', label: 'Propriétaires', icon: UserCheck },
      { href: '/admin/moderation', label: 'Modération', icon: ShieldAlert },
      { href: '/admin/payouts', label: 'Virements', icon: CircleDollarSign },
      { href: '/admin/support', label: 'Support client', icon: HeadphonesIcon },
      { href: '/admin/audit-logs', label: 'Audit logs', icon: BookOpen },
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

/* ─── Flat nav group (Principal · Gestion · Contenu · …) ──────────── */
function NavGroupBlock({
  group,
  isItemActive,
  onNavigate,
}: {
  group: NavGroup;
  isItemActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {group.label}
      </p>
      <div className="space-y-1">
        {group.items.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'border border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]'
                  : 'border border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100'
              )}
            >
              <Icon
                className={cn(
                  'size-4 shrink-0 transition-colors duration-150',
                  isActive ? 'text-amber-300' : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-amber-300" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Collapsible category group (Hébergement, Restauration, …) ───── */
function CategoryGroupBlock({
  group,
  pathname,
  searchParams,
  isItemActive,
  onNavigate,
}: {
  group: CategoryGroup;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  isItemActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
}) {
  // Auto-expand the category whose child is currently active.
  function isChildActive(cat: CategoryNode): boolean {
    if (cat.href && pathname === cat.href.split('?')[0]) return true;
    return !!cat.children?.some((c) => isItemActive(c));
  }

  const [openKey, setOpenKey] = useState<string | null>(() => {
    const auto = group.categories.find((c) => isChildActive(c));
    return auto?.key ?? null;
  });

  // Re-sync open state when route changes (e.g. via clicking a child).
  useEffect(() => {
    const auto = group.categories.find((c) => isChildActive(c));
    if (auto) setOpenKey(auto.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {group.label}
      </p>
      <div className="space-y-1">
        {group.categories.map((cat) => {
          const Icon = cat.icon;
          const open = openKey === cat.key;
          const hasChildren = !!cat.children?.length;
          const headerActive = isChildActive(cat);

          const header = (
            <div
              className={cn(
                'group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                headerActive
                  ? 'border border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]'
                  : 'border border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100'
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 size-4 shrink-0 transition-colors duration-150',
                  headerActive ? 'text-amber-300' : 'text-amber-400/80 group-hover:text-amber-300'
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold leading-tight">{cat.label}</div>
                <div className="mt-0.5 text-[10.5px] leading-tight text-zinc-500">{cat.subtitle}</div>
              </div>
              {hasChildren ? (
                <ChevronDown
                  className={cn(
                    'mt-0.5 size-3.5 shrink-0 text-zinc-500 transition-transform duration-200',
                    open ? 'rotate-0 text-amber-300' : '-rotate-90'
                  )}
                />
              ) : (
                <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
              )}
            </div>
          );

          return (
            <div key={cat.key}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => setOpenKey((k) => (k === cat.key ? null : cat.key))}
                  className="w-full"
                >
                  {header}
                </button>
              ) : cat.href ? (
                <Link href={cat.href} onClick={onNavigate} className="block">
                  {header}
                </Link>
              ) : (
                header
              )}

              {hasChildren && open && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-zinc-800/70 pl-3">
                  {cat.children!.map((child) => {
                    const childActive = isItemActive(child);
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-all duration-150',
                          childActive
                            ? 'bg-amber-400/10 text-amber-300'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                        )}
                      >
                        <ChildIcon
                          className={cn(
                            'size-3.5 shrink-0',
                            childActive ? 'text-amber-300' : 'text-zinc-500'
                          )}
                        />
                        <span className="truncate">{child.label}</span>
                        {childActive && <span className="ml-auto size-1.5 rounded-full bg-amber-300" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuthStore();
  const searchParams = useSearchParams();

  function isItemActive(item: NavItem): boolean {
    const basePath = item.href.split('?')[0];
    if (item.exact) return pathname === basePath;
    if (item.typeQuery) {
      return pathname === basePath && searchParams.get('type') === item.typeQuery;
    }
    if (item.qQuery) {
      return pathname === basePath && searchParams.get('q') === item.qQuery && !searchParams.get('type');
    }
    if (basePath === '/admin/venues') {
      return pathname === basePath && !searchParams.get('type') && !searchParams.get('q');
    }
    return pathname === basePath || pathname.startsWith(basePath + '/');
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-zinc-800/70 bg-zinc-950 px-4 py-4">
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
        {/* Principal */}
        {navGroups.map((group) => (
          <NavGroupBlock
            key={group.label}
            group={group}
            isItemActive={isItemActive}
            onNavigate={onNavigate}
          />
        ))}

        {/* Catégories — collapsible parent groups */}
        <CategoryGroupBlock
          group={categoryGroup}
          pathname={pathname}
          searchParams={searchParams}
          isItemActive={isItemActive}
          onNavigate={onNavigate}
        />

        {/* Gestion · Contenu · Conciergerie · Configuration */}
        {tailNavGroups.map((group) => (
          <NavGroupBlock
            key={group.label}
            group={group}
            isItemActive={isItemActive}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom user panel */}
      <div className="space-y-1 border-t border-zinc-800/70 bg-zinc-950 p-3">
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

  // Once auth is resolved: send guests to login (with returnTo) and
  // non-admins to /unauthorized. Edge middleware no longer guards these
  // routes (auth is a client-side Bearer token), so the layout does it.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname || '/admin/dashboard')}`);
    } else if (user.role !== 'ADMIN') {
      router.replace('/unauthorized');
    }
  }, [isLoading, user, router, pathname]);

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

  const categoryChildren = categoryGroup.categories.flatMap((c) => c.children ?? []);
  const allItems = [
    ...navGroups.flatMap((g) => g.items),
    ...tailNavGroups.flatMap((g) => g.items),
    ...categoryChildren,
  ];
  const searchParamsLayout = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const currentItem = allItems.find((i) => {
    const basePath = i.href.split('?')[0];
    if (i.exact) return pathname === basePath;
    if (i.typeQuery) {
      return pathname === basePath && searchParamsLayout.get('type') === i.typeQuery;
    }
    if (i.qQuery) {
      return pathname === basePath && searchParamsLayout.get('q') === i.qQuery && !searchParamsLayout.get('type');
    }
    return pathname === basePath || pathname.startsWith(basePath + '/');
  });
  const pageTitle = currentItem?.label ?? 'Administration';

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-xl sm:px-6">
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
              <span className="text-sm font-semibold text-zinc-100">{pageTitle}</span>
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
