'use client';

import { Film } from 'lucide-react';
import { CategoryListingPage } from '@/components/shared/CategoryListingPage';

export default function CinemaPage() {
  return (
    <CategoryListingPage
      title="Cinéma"
      subtitle="Salles de cinéma et séances à découvrir en Tunisie."
      mode="venue"
      venueType="CINEMA"
      emptyIcon={<Film className="size-12" />}
      emptyTitle="Aucune salle pour le moment"
      emptyDescription="Revenez bientôt pour découvrir les salles partenaires."
    />
  );
}
