'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CalendarClock,
  ChevronRight,
  Crown,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  User,
  type LucideIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { isOwnerRole } from '@/lib/auth/redirect';

type MobileUserMenuProps = {
  onNavigate?: () => void;
};

function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function AccountLink({
  href,
  icon: Icon,
  title,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-sm font-semibold text-zinc-200 outline-none transition-all duration-200 hover:border-amber-300/20 hover:bg-amber-300/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300/70"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400 transition-colors group-hover:bg-amber-300/10 group-hover:text-amber-200">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-amber-300" />
    </Link>
  );
}

export function MobileUserMenu({ onNavigate }: MobileUserMenuProps) {
  const { user, logout } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isOwner = isOwnerRole(user.role);
  const initials = getInitials(user.fullName);

  const handleLogout = () => {
    setShowConfirm(false);
    onNavigate?.();
    logout();
  };

  return (
    <>
      <section
        aria-label="Compte utilisateur"
        className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <div className="flex items-center gap-3 px-1 pb-3">
          <Avatar className="size-11 shrink-0 ring-2 ring-amber-300/35 ring-offset-2 ring-offset-[#080806]">
            <AvatarFallback className="bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-sm font-black text-black">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user.fullName}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-400">{user.email}</p>
            <div className="mt-1.5">
              {isAdmin ? (
                <Badge className="border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  <Shield className="mr-1 size-3" />
                  Admin
                </Badge>
              ) : isOwner ? (
                <Badge className="border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-200">
                  <Crown className="mr-1 size-3" />
                  Propriétaire
                </Badge>
              ) : (
                <Badge className="border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  <User className="mr-1 size-3" />
                  Utilisateur
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          {isAdmin ? (
            <AccountLink href="/admin/dashboard" icon={LayoutDashboard} title="Tableau de bord" onNavigate={onNavigate} />
          ) : (
            <AccountLink href="/mes-reservations" icon={CalendarClock} title="Mes réservations" onNavigate={onNavigate} />
          )}

          {isOwner && (
            <AccountLink href="/owner" icon={LayoutDashboard} title="Espace propriétaire" onNavigate={onNavigate} />
          )}

          <AccountLink
            href={isAdmin ? '/admin/settings' : '/profile'}
            icon={Settings}
            title="Paramètres du profil"
            onNavigate={onNavigate}
          />

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="group flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-300/10 bg-red-500/[0.045] px-3 py-2.5 text-left text-sm font-semibold text-red-300 outline-none transition-all duration-200 hover:bg-red-500/10 hover:text-red-200 focus-visible:ring-2 focus-visible:ring-red-300/60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <LogOut className="size-4" />
            </span>
            <span className="flex-1">Déconnexion</span>
          </button>
        </div>
      </section>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] border-white/[0.08] bg-[#070706] text-zinc-100 shadow-2xl shadow-black/50 sm:max-w-md">
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border border-red-300/15 bg-red-500/10">
                <LogOut className="size-5 text-red-300" />
              </div>
              <AlertDialogTitle className="text-lg text-white">Confirmer la déconnexion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-1 text-zinc-400">
              Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setShowConfirm(false)}
              className="border-white/[0.10] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 text-white hover:bg-red-400">
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
