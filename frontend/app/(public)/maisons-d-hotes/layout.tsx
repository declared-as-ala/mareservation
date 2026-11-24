import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Maisons d'hôtes en Tunisie",
  description:
    "Découvrez les maisons d'hôtes de Tunisie, visitez-les en 360° et vérifiez la disponibilité en temps réel avant de réserver.",
  // Search result URLs (?city=&checkIn=…) all canonicalise to the listing itself.
  alternates: { canonical: '/maisons-d-hotes' },
};

export default function MaisonsDHotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
