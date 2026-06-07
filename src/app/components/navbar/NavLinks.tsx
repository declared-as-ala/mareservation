import { Link, useLocation } from 'react-router';
import { cn } from '../ui/utils';

const navItems = [
  { label: 'Explorer', path: '/explorer' },
  { label: 'Lieux', path: '/explorer' },
  { label: 'À propos', path: '/#a-propos' },
];

interface NavLinksProps {
  className?: string;
  onNavigate?: () => void;
  variant?: 'desktop' | 'mobile';
}

export function NavLinks({ className, onNavigate, variant = 'desktop' }: NavLinksProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path.startsWith('/#')) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (variant === 'mobile') {
    return (
      <nav className={cn('flex flex-col gap-1', className)} aria-label="Navigation principale">
        {navItems.map((item) => (
          <Link
            key={`${item.label}-${item.path}`}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'rounded-lg px-4 py-3 text-base font-medium transition-colors',
              isActive(item.path)
                ? 'bg-landing-gold/15 text-landing-gold'
                : 'text-landing-text hover:bg-landing-card hover:text-landing-gold'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn('flex items-center gap-8', className)} aria-label="Navigation principale">
      {navItems.map((item) => (
        <Link
          key={`${item.label}-${item.path}`}
          to={item.path}
          className={cn(
            'relative text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg',
            isActive(item.path)
              ? 'text-landing-gold'
              : 'text-landing-text/90 hover:text-landing-gold'
          )}
        >
          {item.label}
          {isActive(item.path) && (
            <span
              className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-landing-gold animate-in fade-in duration-200"
              aria-hidden
            />
          )}
        </Link>
      ))}
    </nav>
  );
}
