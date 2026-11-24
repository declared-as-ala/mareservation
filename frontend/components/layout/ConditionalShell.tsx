'use client';

import { usePathname } from 'next/navigation';
import { SiteNavbar } from '@/components/site/SiteNavbar';
import { SiteFooter } from '@/components/site/SiteFooter';
import { LocaleProvider } from '@/lib/i18n';
import { MotionProvider } from '@/components/site/motion';
import { MobileTabBar } from '@/components/site/MobileTabBar';

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The owner dashboard provides its own shell (sidebar + topbar) via
  // app/(public)/owner/layout.tsx — render it without the public navbar/footer.
  if (pathname.startsWith('/owner')) {
    return <LocaleProvider><MotionProvider>{children}</MotionProvider></LocaleProvider>;
  }

  return (
    <LocaleProvider>
      <MotionProvider>
      <div className="theme-light flex min-h-screen flex-col">
        <SiteNavbar />
        <main id="contenu" className="flex-1">{children}</main>
        <SiteFooter />
        <MobileTabBar />
      </div>
      </MotionProvider>
    </LocaleProvider>
  );
}
