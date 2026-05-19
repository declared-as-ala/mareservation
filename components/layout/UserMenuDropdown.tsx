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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';

type MenuLinkProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'gold' | 'blue' | 'purple';
};

const toneStyles = {
  gold: {
    icon: 'group-hover:text-amber-300',
    iconBg: 'group-hover:bg-amber-300/10',
    arrow: 'group-hover:text-amber-300',
  },
  blue: {
    icon: 'group-hover:text-sky-300',
    iconBg: 'group-hover:bg-sky-300/10',
    arrow: 'group-hover:text-sky-300',
  },
  purple: {
    icon: 'group-hover:text-violet-300',
    iconBg: 'group-hover:bg-violet-300/10',
    arrow: 'group-hover:text-violet-300',
  },
} satisfies Record<string, Record<string, string>>;

function MenuLink({ href, icon: Icon, title, description, tone = 'gold' }: MenuLinkProps) {
  const styles = toneStyles[tone];

  return (
    <DropdownMenuItem asChild className="p-0">
      <Link
        href={href}
        className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-all duration-200 hover:bg-white/[0.055] focus-visible:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-amber-300/60"
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] transition-colors duration-200',
            styles.iconBg
          )}
        >
          <Icon className={cn('size-4 text-zinc-400 transition-colors duration-200', styles.icon)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-100 transition-colors duration-200 group-hover:text-white">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
            {description}
          </span>
        </span>
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5',
            styles.arrow
          )}
        />
      </Link>
    </DropdownMenuItem>
  );
}

export function UserMenuDropdown() {
  const { user, logout } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isOwner = user.role === 'VENUE_OWNER' || user.role === 'ORGANIZER' || user.role === 'ESTABLISHMENT_OWNER';

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleBadge = () => {
    if (isAdmin) {
      return (
        <Badge className="border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 hover:bg-amber-300/15">
          <Shield className="mr-1 size-3" />
          Admin
        </Badge>
      );
    }

    if (isOwner) {
      return (
        <Badge className="border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-200 hover:bg-sky-300/15">
          <Crown className="mr-1 size-3" />
          Propriétaire
        </Badge>
      );
    }

    return (
      <Badge className="border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 hover:bg-white/[0.08]">
        <User className="mr-1 size-3" />
        Utilisateur
      </Badge>
    );
  };

  const handleLogoutConfirm = () => {
    setShowConfirm(false);
    logout();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="group relative flex h-12 max-w-[220px] items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-2.5 pr-3 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all duration-200 hover:border-amber-300/35 hover:bg-amber-300/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300/70"
            aria-label="Ouvrir le menu du profil"
          >
            <Avatar className="size-9 ring-2 ring-amber-300/25 ring-offset-2 ring-offset-[#050504] transition-all duration-200 group-hover:ring-amber-300/55">
              <AvatarFallback className="bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-xs font-black text-black">
                {initials || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 lg:block">
              <span className="block max-w-[130px] truncate text-left text-sm font-semibold leading-4 text-zinc-100">
                {user.fullName}
              </span>
              <span className="mt-0.5 block text-left text-[10px] font-medium uppercase tracking-wide text-amber-200/70">
                Mon espace
              </span>
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={12}
          className="w-[320px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070706]/96 p-0 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div className="relative border-b border-white/[0.07] p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(245,158,11,0.20),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" aria-hidden />
            <div className="relative flex items-start gap-3">
              <Avatar className="size-12 ring-2 ring-amber-300/35 ring-offset-2 ring-offset-[#070706]">
                <AvatarFallback className="bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-base font-black text-black">
                  {initials || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{user.fullName}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">{user.email}</p>
                <div className="mt-2">{roleBadge()}</div>
              </div>
            </div>
          </div>

          <DropdownMenuGroup className="p-2">
            {isAdmin ? (
              <MenuLink
                href="/admin/dashboard"
                icon={LayoutDashboard}
                title="Tableau de bord"
                description="Vue d'ensemble de la plateforme"
              />
            ) : (
              <MenuLink
                href="/mes-reservations"
                icon={CalendarClock}
                title="Mes réservations"
                description="Historique et prochaines réservations"
              />
            )}

            {isOwner && (
              <MenuLink
                href="/owner"
                icon={LayoutDashboard}
                title="Espace propriétaire"
                description="Mes lieux et réservations"
                tone="blue"
              />
            )}

            <MenuLink
              href={isAdmin ? '/admin/settings' : '/profile'}
              icon={Settings}
              title="Paramètres"
              description="Gérer mon profil"
            />

            {isAdmin && (
              <MenuLink
                href="/admin/users"
                icon={Crown}
                title="Utilisateurs"
                description="Gestion des comptes"
                tone="purple"
              />
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="bg-white/[0.07]" />

          <div className="p-2">
            <DropdownMenuItem
              className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-red-300 outline-none transition-all duration-200 hover:bg-red-500/10 hover:text-red-200 focus:bg-red-500/10 focus:text-red-200"
              onClick={() => setShowConfirm(true)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-300/10 bg-red-500/10 transition-colors duration-200 group-hover:bg-red-500/15">
                <LogOut className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Déconnexion</span>
                <span className="mt-0.5 block text-xs text-red-200/45">Fermer la session</span>
              </span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-md border-white/[0.08] bg-[#070706] text-zinc-100 shadow-2xl shadow-black/50">
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border border-red-300/15 bg-red-500/10">
                <LogOut className="size-5 text-red-300" />
              </div>
              <AlertDialogTitle className="text-lg text-white">
                Confirmer la déconnexion
              </AlertDialogTitle>
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
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-500 text-white hover:bg-red-400"
            >
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
