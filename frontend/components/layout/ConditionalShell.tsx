'use client';

import { usePathname } from 'next/navigation';
import { HomeNavbar } from '@/components/home/HomeNavbar';
import { Footer } from './Footer';

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The owner dashboard provides its own shell (sidebar + topbar) via
  // app/(public)/owner/layout.tsx — render it without the public navbar/footer.
  if (pathname.startsWith('/owner')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HomeNavbar />
      <main className="flex-1">{children}</main>
      {/* The newsletter form was a non-functional placeholder (no backend) — never shown. */}
      <Footer hideNewsletter />
    </div>
  );
}
