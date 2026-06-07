import { Search, User, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { Link, useLocation } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/">
            <Logo />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`transition-colors hover:text-accent ${
                isActive('/') ? 'text-accent font-medium' : 'text-foreground'
              }`}
            >
              Accueil
            </Link>
            <Link
              to="/explorer"
              className={`transition-colors hover:text-accent ${
                isActive('/explorer') ? 'text-accent font-medium' : 'text-foreground'
              }`}
            >
              Explorer
            </Link>
            <Link
              to="/restaurants"
              className={`transition-colors hover:text-accent ${
                isActive('/restaurants') ? 'text-accent font-medium' : 'text-foreground'
              }`}
            >
              Restaurants
            </Link>
            <Link
              to="/cafes"
              className={`transition-colors hover:text-accent ${
                isActive('/cafes') ? 'text-accent font-medium' : 'text-foreground'
              }`}
            >
              Cafés
            </Link>
            <Link
              to="/evenements"
              className={`transition-colors hover:text-accent ${
                isActive('/evenements') ? 'text-accent font-medium' : 'text-foreground'
              }`}
            >
              Événements
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un restaurant, un café ou un événement…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              />
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden md:flex items-center gap-2 text-foreground hover:text-accent transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>{user?.name || 'Mon compte'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="hidden md:flex items-center gap-2 text-foreground hover:text-accent transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 text-foreground hover:text-accent transition-colors"
              >
                <User className="w-5 h-5" />
                <span>Connexion</span>
              </Link>
            )}
            <Link
              to="/proposer"
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
            >
              Proposer mon établissement
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="lg:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
