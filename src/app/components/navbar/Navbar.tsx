import { useState } from 'react';
import { Link } from 'react-router';
import { Menu, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavLinks } from './NavLinks';
import { SearchBar } from './SearchBar';
import { UserMenu } from './UserMenu';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { cn } from '../ui/utils';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full',
          'bg-gradient-to-b from-landing-bg/98 to-landing-bg',
          'border-b border-landing-gold/20',
          'backdrop-blur-md'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16 lg:h-[72px]">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg rounded"
            >
              <img src="/logo.png" alt="" className="h-8 w-auto" />
              <span
                className="text-xl lg:text-2xl font-semibold text-landing-gold tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Ma Reservation
              </span>
            </Link>

            {/* Desktop: Search */}
            <div className="hidden md:flex flex-1 justify-center min-w-0 mx-4">
              <SearchBar />
            </div>

            {/* Desktop: Nav links */}
            <div className="hidden lg:flex items-center flex-1 justify-center">
              <NavLinks />
            </div>

            {/* Desktop: User area */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <Link
                  to="/connexion"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-semibold text-sm shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:bg-landing-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg transition-colors"
                >
                  Se connecter
                </Link>
              )}
            </div>

            {/* Mobile: Search icon + Hamburger */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="p-2.5 rounded-lg text-landing-text hover:bg-landing-card hover:text-landing-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold"
                aria-label="Rechercher"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="p-2.5 rounded-lg text-landing-text hover:bg-landing-card hover:text-landing-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold"
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <MobileMenuDrawer open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
