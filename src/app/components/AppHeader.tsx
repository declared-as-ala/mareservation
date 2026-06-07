import { Link, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
import { Menu, User, LogOut, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';

const navItems = [
  { label: 'Explorer', path: '/explorer' },
  { label: 'Lieux', path: '/explorer' },
  { label: 'À propos', path: '/#a-propos' },
];

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { globalSearchQuery, setGlobalSearchQuery } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = (e.currentTarget.querySelector('input')?.value ?? '').trim();
    setGlobalSearchQuery(q);
    if (q) navigate(`/explorer?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  };

  const isActive = (path: string) => {
    if (path.startsWith('/#')) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-landing-border/50 bg-landing-bg/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Ma Reservation" className="h-7 md:h-8 w-auto" />
            <span className="font-serif text-xl font-semibold text-landing-gold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Ma Reservation
            </span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xs lg:max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-landing-text-muted" />
              <input
                type="search"
                name="q"
                defaultValue={globalSearchQuery}
                placeholder="Rechercher un lieu, événement, ville..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text placeholder-landing-text-muted/70 text-sm focus:outline-none focus:ring-2 focus:ring-landing-gold focus:border-transparent"
              />
            </div>
          </form>
          <nav className="hidden lg:flex items-center justify-center gap-8 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.label + item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-landing-gold border-b-2 border-landing-gold pb-0.5'
                    : 'text-landing-text hover:text-landing-gold'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-landing-text hover:text-landing-gold transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  {user?.fullName || 'Mon compte'}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm text-landing-text hover:text-landing-gold transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/connexion"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:bg-landing-gold-light transition-colors"
              >
                Se connecter
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/connexion"
              className="p-2 text-landing-gold rounded-lg hover:bg-white/5"
              aria-label="Se connecter"
            >
              <User className="w-6 h-6" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 text-landing-gold rounded-lg hover:bg-white/5"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-landing-border/50">
            <form onSubmit={handleSearchSubmit} className="px-2 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-landing-text-muted" />
                <input
                  type="search"
                  name="q"
                  placeholder="Rechercher un lieu, événement, ville..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text placeholder-landing-text-muted/70 text-sm"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label + item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`py-3 px-2 rounded-lg text-landing-text ${
                    isActive(item.path) ? 'bg-landing-gold/20 text-landing-gold' : 'hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="py-3 px-2 rounded-lg text-landing-text hover:bg-white/5"
                  >
                    Mon compte
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="py-3 px-2 rounded-lg text-left text-landing-text hover:bg-white/5"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  to="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 inline-flex justify-center px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm w-full"
                >
                  Se connecter
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
