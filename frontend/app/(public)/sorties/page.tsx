'use client';

import { Martini, Sunset, Waves, Music, Wine, Sparkles } from 'lucide-react';
import { CollectionExplorer, type CollectionCategory } from '@/components/discover/CollectionExplorer';

const CATEGORIES: CollectionCategory[] = [
  { value: 'bar', label: 'Bars', Icon: Martini, keywords: ['bar'] },
  { value: 'rooftop', label: 'Rooftops', Icon: Sunset, keywords: ['rooftop'] },
  { value: 'beach-club', label: 'Beach Clubs', Icon: Waves, keywords: ['beach club', 'beach', 'plage'] },
  { value: 'club', label: 'Clubs', Icon: Music, keywords: ['club', 'nightclub', 'discothèque'] },
  { value: 'lounge', label: 'Lounges', Icon: Wine, keywords: ['lounge'] },
];

export default function SortiesPage() {
  return (
    <CollectionExplorer
      cacheKey="sorties"
      eyebrow="Sorties"
      badgeIcon={Sparkles}
      titleLead="Bars, rooftops & clubs,"
      titleHighlight="pour vos soirées."
      subtitle="Les meilleurs spots pour sortir en Tunisie — un verre en rooftop, un cocktail au lounge ou une nuit en club."
      emptyLabel="Aucune sortie trouvée"
      categories={CATEGORIES}
    />
  );
}
