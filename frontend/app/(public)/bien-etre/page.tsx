'use client';

import { Flower2, Waves, Droplets, HandHeart, Leaf } from 'lucide-react';
import { CollectionExplorer, type CollectionCategory } from '@/components/discover/CollectionExplorer';

const CATEGORIES: CollectionCategory[] = [
  { value: 'spa', label: 'Spas', Icon: Flower2, keywords: ['spa'] },
  { value: 'piscine', label: 'Piscines', Icon: Waves, keywords: ['piscine', 'pool'] },
  { value: 'hammam', label: 'Hammams', Icon: Droplets, keywords: ['hammam'] },
  { value: 'massage', label: 'Massages', Icon: HandHeart, keywords: ['massage'] },
  { value: 'thalasso', label: 'Thalasso', Icon: Leaf, keywords: ['thalasso', 'thalassothérapie'] },
];

export default function BienEtrePage() {
  return (
    <CollectionExplorer
      cacheKey="bien-etre"
      eyebrow="Bien-être"
      badgeIcon={Flower2}
      titleLead="Spas, piscines & hammams,"
      titleHighlight="pour vous ressourcer."
      subtitle="Réservez une parenthèse détente — spa, thalasso, hammam traditionnel ou journée piscine dans les plus beaux établissements."
      emptyLabel="Aucun établissement trouvé"
      categories={CATEGORIES}
    />
  );
}
