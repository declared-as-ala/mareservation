import { Link } from 'react-router';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';
import { NavLinks } from './NavLinks';
import { SearchBar } from './SearchBar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/utils';

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuDrawer({ open, onOpenChange }: MobileMenuDrawerProps) {
  const { isAuthenticated, user } = useAuth();

  const handleNavigate = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full max-w-sm border-l border-landing-border bg-landing-bg [&>button.absolute]:text-landing-text [&>button.absolute]:hover:text-landing-gold [&>button.absolute]:focus:ring-landing-gold"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex flex-col flex-1 overflow-auto pt-6">
          <div className="px-4 pb-4">
            <SearchBar onNavigate={handleNavigate} compact />
          </div>
          <div className="flex-1 px-2">
            <NavLinks variant="mobile" onNavigate={handleNavigate} />
          </div>
          <div className="mt-auto border-t border-landing-border p-4">
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-landing-text-muted px-2">{user.fullName || user.email}</p>
                <Link
                  to="/dashboard"
                  onClick={handleNavigate}
                  className={cn(
                    'rounded-lg px-4 py-3 text-center text-sm font-medium text-landing-text',
                    'bg-landing-card border border-landing-border hover:bg-landing-gold/10 hover:border-landing-gold/30 hover:text-landing-gold'
                  )}
                >
                  Mon compte
                </Link>
              </div>
            ) : (
              <Link
                to="/connexion"
                onClick={handleNavigate}
                className="block w-full rounded-lg bg-landing-gold px-4 py-3 text-center text-sm font-semibold text-[#161616] hover:bg-landing-gold-light transition-colors"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
