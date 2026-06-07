import { Link } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useUIStore } from '../store/uiStore';

export function AuthRequiredModal() {
  const { authRequiredOpen, closeAuthRequired } = useUIStore();

  return (
    <Dialog open={authRequiredOpen} onOpenChange={(open) => !open && closeAuthRequired()}>
      <DialogContent className="bg-landing-card border-landing-border text-landing-text sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-landing-text font-semibold text-xl">
            Connexion requise
          </DialogTitle>
          <DialogDescription className="text-landing-text-muted">
            Vous devez vous connecter pour réserver une table.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            to="/connexion"
            onClick={closeAuthRequired}
            className="inline-flex justify-center px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light transition-colors"
          >
            Se connecter
          </Link>
          <Link
            to="/connexion?tab=signup"
            onClick={closeAuthRequired}
            className="inline-flex justify-center px-6 py-3 rounded-lg border border-landing-gold text-landing-gold font-medium hover:bg-landing-gold/10 transition-colors"
          >
            Créer un compte
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
