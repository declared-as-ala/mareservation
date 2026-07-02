'use client';

import { usePathname } from 'next/navigation';
import { HomeNavbar } from '@/components/home/HomeNavbar';
import { Footer } from './Footer';

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  // The owner dashboard provides its own shell (sidebar + topbar) via
  // app/(public)/owner/layout.tsx — render it without the public navbar/footer.
  if (pathname.startsWith('/owner') || pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HomeNavbar />
      <main className="flex-1">{children}</main>
      <Footer hideNewsletter={isHome} />
    </div>
  );
}
