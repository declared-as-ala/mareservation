import { Compass } from 'lucide-react';
import { ConditionalShell } from '@/components/layout/ConditionalShell';
import { StatusPage } from '@/components/site/StatusPage';

// Unmatched URLs render here, outside the (public) group: wrap in the public shell so the
// page keeps the navbar, footer and mobile tab bar.
export default function NotFound() {
  return (
    <ConditionalShell>
      <StatusPage
        icon={<Compass />}
        code="404"
        title="Cette page n’existe pas"
        text="Le lien est peut-être erroné ou la page a été déplacée. Les maisons d’hôtes, elles, sont toujours là."
        primary={{ href: '/maisons-d-hotes', label: 'Découvrir les maisons d’hôtes' }}
        secondary={{ href: '/', label: 'Accueil' }}
      />
    </ConditionalShell>
  );
}
