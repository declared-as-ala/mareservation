'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, BedDouble, BriefcaseBusiness, UtensilsCrossed,
  BookOpen, CalendarDays, CalendarRange, Tag, CalendarCheck, Wallet, BarChart3, QrCode,
} from 'lucide-react';
import { fetchOwnerVenues } from '@/lib/api/owner';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import { DashboardShell, type NavGroup, type NavItem } from '@/components/dashboard/DashboardShell';

/**
 * Builds a category-aware owner navigation: a café owner never sees
 * "Chambres", a hotel owner never sees "Coworking", etc.
 */
function buildOwnerNav(types: Set<string>): NavGroup[] {
  const hasHotel = types.has('HOTEL');
  const hasCoworking = types.has('COWORKING');
  const hasFood = types.has('CAFE') || types.has('CAFE_LOUNGE') || types.has('RESTAURANT');
  const hasEvent = types.has('EVENT_SPACE');
  const hasCinema = types.has('CINEMA');

  const ops: NavItem[] = [];
  if (hasHotel) {
    ops.push({ label: 'Chambres', href: '/owner/rooms', icon: BedDouble });
    ops.push({ label: 'Disponibilités', href: '/owner/availability', icon: CalendarRange });
  }
  if (hasCoworking) {
    ops.push({ label: 'Espaces & 360°', href: '/owner/coworking-operations', icon: BriefcaseBusiness });
  }
  if (hasFood) {
    ops.push({ label: 'Tables & service', href: '/owner/table-operations', icon: UtensilsCrossed });
    ops.push({ label: 'Carte & menu', href: '/owner/menu-du-jour', icon: BookOpen });
  }
  if (hasEvent || hasCinema) {
    ops.push({ label: 'Événements', href: '/owner/events', icon: CalendarDays });
  }
  ops.push({ label: 'Tarifs & promos', href: '/owner/pricing', icon: Tag });

  return [
    {
      items: [
        { label: 'Tableau de bord', href: '/owner', icon: LayoutDashboard },
        { label: 'Mon établissement', href: '/owner/my-establishment', icon: Building2 },
      ],
    },
    { label: 'Opérations', items: ops },
    {
      label: 'Activité',
      items: [
        { label: 'Réservations', href: '/owner/reservations', icon: CalendarCheck },
        { label: 'Paiements', href: '/owner/payments', icon: Wallet },
        { label: 'Rapports', href: '/owner/reports', icon: BarChart3 },
        { label: 'Scanner QR', href: '/owner/scanner', icon: QrCode },
      ],
    },
  ];
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const logout = useAuthStore((s) => s.logout);

  const { data: venues = [] } = useQuery({
    queryKey: ['owner-venues'],
    queryFn: fetchOwnerVenues,
  });

  const nav = useMemo(() => {
    const types = new Set(venues.map((v) => String(v.type ?? '').toUpperCase()));
    return buildOwnerNav(types);
  }, [venues]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <DashboardShell
      brand="Espace Propriétaire"
      homeHref="/owner"
      nav={nav}
      user={{
        name: (user as { fullName?: string } | null)?.fullName,
        email: (user as { email?: string } | null)?.email,
        role: 'Propriétaire',
      }}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
