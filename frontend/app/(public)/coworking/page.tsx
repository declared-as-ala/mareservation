'use client';

import { BriefcaseBusiness } from 'lucide-react';
import { CategoryListingPage } from '@/components/shared/CategoryListingPage';

export default function CoworkingPage() {
  return (
    <CategoryListingPage
      title="Coworking Spaces"
      subtitle="Réservez des espaces de travail flexibles, bureaux privés et salles de réunion."
      mode="venue"
      venueType="COWORKING"
      backHref="/"
      emptyIcon={<BriefcaseBusiness className="size-12" />}
      emptyTitle="Aucun espace coworking pour le moment"
      emptyDescription="Revenez bientôt pour découvrir nos espaces partenaires."
    />
  );
}
