'use client';

/**
 * App-style bottom tab bar (phones/tablets < 768px). Translucent material, safe-area aware,
 * gold active indicator, role-aware "Compte" tab. Hidden where a page has its own sticky
 * bottom action (maison page booking bar) so two bars never stack.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck2, Compass, Home, Map, UserRound } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

export const TAB_BAR_HIDDEN = (pathname: string) => pathname.startsWith('/maison-d-hote/') || pathname.startsWith('/reservation-demande/');

export function MobileTabBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  if (TAB_BAR_HIDDEN(pathname)) return null;

  const accountHref = !user ? '/login' : user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'ESTABLISHMENT_OWNER' ? '/owner' : '/profile';
  const tabs = [
    { href: '/', label: 'Accueil', icon: Home, active: pathname === '/' },
    { href: '/maisons-d-hotes', label: 'Explorer', icon: Compass, active: pathname === '/maisons-d-hotes' },
    { href: '/carte', label: 'Carte', icon: Map, active: pathname === '/carte' },
    { href: user ? '/mes-reservations' : '/login?returnTo=%2Fmes-reservations', label: 'Réservations', icon: CalendarCheck2, active: pathname.startsWith('/mes-reservations') },
    { href: accountHref, label: user ? 'Compte' : 'Connexion', icon: UserRound, active: ['/login', '/register', '/profile'].includes(pathname) },
  ];

  return (
    <>
      <nav
        aria-label="Navigation mobile"
        className="ex-tabbar fixed inset-x-0 bottom-0 z-[58] border-t border-[#17140f]/10 bg-[#faf7f1]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {tabs.map(({ href, label, icon: Icon, active }) => (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors active:scale-95', active ? 'text-[#17140f]' : 'text-[#8c8475]')}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#e0a527]" aria-hidden="true" />}
                <Icon className={cn('size-[22px] transition-transform', active ? 'stroke-[2.2] text-[#b07d12]' : 'stroke-[1.7]')} aria-hidden="true" />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Keeps the last content (and the footer) above the bar */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] bg-[#F3EEE4] md:hidden" aria-hidden="true" />
    </>
  );
}
