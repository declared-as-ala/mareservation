import { Link } from 'react-router';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-landing-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl md:text-9xl font-bold text-landing-gold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>404</h1>
        <h2 className="mb-4 text-landing-text text-xl font-semibold">Page non trouvée</h2>
        <p className="text-landing-text-muted mb-8 max-w-md">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
        >
          <Home className="w-5 h-5" />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
