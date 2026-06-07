import { Link } from 'react-router';
import { User, Calendar, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../ui/utils';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) return null;

  const initials = user.fullName ? getInitials(user.fullName) : (user.email?.[0] ?? 'U').toUpperCase();
  const displayName = user.fullName || user.email || 'Mon compte';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition-colors',
          'hover:bg-landing-card focus-visible:ring-2 focus-visible:ring-landing-gold focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg'
        )}
        aria-label="Menu compte"
      >
        <Avatar className="h-8 w-8 rounded-full border border-landing-gold/30 bg-landing-gold/20">
          <AvatarFallback className="text-xs font-semibold text-landing-gold bg-transparent">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[120px] truncate text-sm font-medium text-landing-text">
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[200px] rounded-xl border-landing-border bg-landing-card py-1 shadow-xl"
      >
        <DropdownMenuItem asChild>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-landing-text focus:bg-landing-gold/10 focus:text-landing-gold"
          >
            <User className="w-4 h-4" />
            Mon profil
          </Link>
        </DropdownMenuItem>
        {user.role === 'CUSTOMER' && (
          <DropdownMenuItem asChild>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-landing-text focus:bg-landing-gold/10 focus:text-landing-gold"
            >
              <Calendar className="w-4 h-4" />
              Mes réservations
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === 'ADMIN' && (
          <DropdownMenuItem asChild>
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-landing-text focus:bg-landing-gold/10 focus:text-landing-gold"
            >
              <Calendar className="w-4 h-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-landing-text focus:bg-landing-gold/10 focus:text-landing-gold"
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-landing-border" />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => logout()}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
