import { Link } from 'react-router';
import { useState } from 'react';
import { Menu, User } from 'lucide-react';
import { navItems } from '../../data/landingData';

export function HeaderNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-landing-border/50"
      style={{
        background: 'linear-gradient(180deg, rgba(22,22,22,0.95) 0%, rgba(22,22,22,0.85) 100%)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[4.5rem]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Ma Reservation" className="h-8 md:h-9 w-auto" />
            <span className="font-serif text-xl md:text-2xl font-semibold text-landing-gold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Ma Reservation
            </span>
          </Link>

          {/* Desktop nav - center */}
          <nav className="hidden lg:flex items-center justify-center gap-8 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="text-sm font-medium text-landing-text hover:text-landing-gold transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: CTA desktop */}
          <div className="hidden lg:block shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:bg-landing-gold-light transition-colors"
            >
              Se Connecter
            </Link>
          </div>

          {/* Mobile: hamburger + icon */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 text-landing-gold hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <Link
              to="/login"
              className="p-2 text-landing-gold hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Se connecter"
            >
              <User className="w-6 h-6" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-landing-border/50">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-landing-text hover:text-landing-gold transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium text-sm w-fit"
              >
                Se Connecter
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
