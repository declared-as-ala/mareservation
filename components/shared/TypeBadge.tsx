import { Badge } from '@/components/ui/badge';

type SupportedType = 'CAFE' | 'CAFE_LOUNGE' | 'RESTAURANT' | 'HOTEL' | 'COWORKING' | 'CINEMA' | 'EVENT' | 'EVENT_SPACE';

const LABELS: Record<SupportedType, string> = {
  CAFE: 'Café',
  CAFE_LOUNGE: 'Café & Lounge',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  COWORKING: 'Coworking',
  CINEMA: 'Cinéma',
  EVENT: 'Événement',
  EVENT_SPACE: 'Événements',
};

const COLORS: Record<SupportedType, string> = {
  CAFE: 'bg-emerald-500/15 text-emerald-400',
  CAFE_LOUNGE: 'bg-emerald-500/15 text-emerald-400',
  RESTAURANT: 'bg-orange-500/15 text-orange-400',
  HOTEL: 'bg-sky-500/15 text-sky-400',
  COWORKING: 'bg-blue-500/15 text-blue-400',
  CINEMA: 'bg-purple-500/15 text-purple-400',
  EVENT: 'bg-pink-500/15 text-pink-400',
  EVENT_SPACE: 'bg-pink-500/15 text-pink-400',
};

interface TypeBadgeProps {
  type: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export function TypeBadge({ type, size = 'sm', className }: TypeBadgeProps) {
  const key = (type || 'EVENT_SPACE').toUpperCase() as SupportedType;
  const label = LABELS[key] ?? type ?? 'Autre';
  const color = COLORS[key] ?? 'bg-muted text-muted-foreground';

  return (
    <Badge
      variant="secondary"
      className={[
        'border-none font-medium',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        color,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </Badge>
  );
}

