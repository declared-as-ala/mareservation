import { Lock } from 'lucide-react';
import { StatusPage } from '@/components/site/StatusPage';

export default function UnauthorizedPage() {
  return (
    <StatusPage
      icon={<Lock />}
      title="Accès refusé"
      text="Votre compte n’a pas les droits nécessaires pour ouvrir cette page."
      primary={{ href: '/', label: 'Retour à l’accueil' }}
      secondary={{ href: '/mes-reservations', label: 'Mes réservations' }}
    />
  );
}
