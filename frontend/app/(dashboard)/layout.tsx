'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect ADMIN to /admin once auth is resolved.
  useEffect(() => {
    if (!isLoading && user && user.role === 'ADMIN') {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, user, router]);

  // Show skeleton while AuthProvider is validating the session.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <p className="text-sm text-zinc-500">Chargement…</p>
        </div>
      </div>
    );
  }

  // If no user after resolution, the middleware should have already
  // redirected to /login.  Render nothing as a safety net.
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}
