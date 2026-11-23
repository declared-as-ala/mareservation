'use client';

import { usePathname } from 'next/navigation';
import { SiteNavbar } from '@/components/site/SiteNavbar';
import { SiteFooter } from '@/components/site/SiteFooter';
import { LocaleProvider } from '@/lib/i18n';

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The owner dashboard provides its own shell (sidebar + topbar) via
  // app/(public)/owner/layout.tsx — render it without the public navbar/footer.
  if (pathname.startsWith('/owner')) {
    return <LocaleProvider>{children}</LocaleProvider>;
  }

  return (
    <LocaleProvider>
      <div className="theme-light flex min-h-screen flex-col">
        <SiteNavbar />
        <main id="contenu" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
