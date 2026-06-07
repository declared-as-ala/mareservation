'use client';

import {
  Wifi,
  Car,
  Waves,
  Sparkles,
  UtensilsCrossed,
  Wine,
  Dumbbell,
  Wind,
  Bell,
  Sunset,
  Trees,
  Droplets,
  Lock,
  Tv,
  Bath,
  Coffee,
  ShieldCheck,
  Briefcase,
  Music,
  Baby,
  Dog,
  Cigarette,
  CigaretteOff,
  Accessibility,
  Phone,
  Camera,
  Shirt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Amenity icon registry ──────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  wifi: <Wifi className="size-4" />,
  'wi-fi': <Wifi className="size-4" />,
  internet: <Wifi className="size-4" />,
  parking: <Car className="size-4" />,
  pool: <Waves className="size-4" />,
  piscine: <Waves className="size-4" />,
  spa: <Sparkles className="size-4" />,
  restaurant: <UtensilsCrossed className="size-4" />,
  bar: <Wine className="size-4" />,
  gym: <Dumbbell className="size-4" />,
  fitness: <Dumbbell className="size-4" />,
  'air-conditioning': <Wind className="size-4" />,
  'climatisation': <Wind className="size-4" />,
  concierge: <Bell className="size-4" />,
  'room-service': <Bell className="size-4" />,
  beach: <Sunset className="size-4" />,
  plage: <Sunset className="size-4" />,
  terrace: <Trees className="size-4" />,
  terrasse: <Trees className="size-4" />,
  balcony: <Trees className="size-4" />,
  balcon: <Trees className="size-4" />,
  jacuzzi: <Droplets className="size-4" />,
  jacuzzi_room: <Droplets className="size-4" />,
  minibar: <Wine className="size-4" />,
  safe: <Lock className="size-4" />,
  coffre: <Lock className="size-4" />,
  tv: <Tv className="size-4" />,
  television: <Tv className="size-4" />,
  bathtub: <Bath className="size-4" />,
  baignoire: <Bath className="size-4" />,
  breakfast: <Coffee className="size-4" />,
  'petit-déjeuner': <Coffee className="size-4" />,
  security: <ShieldCheck className="size-4" />,
  'business-center': <Briefcase className="size-4" />,
  entertainment: <Music className="size-4" />,
  kids: <Baby className="size-4" />,
  'family-friendly': <Baby className="size-4" />,
  'pet-friendly': <Dog className="size-4" />,
  smoking: <Cigarette className="size-4" />,
  'no-smoking': <CigaretteOff className="size-4" />,
  accessible: <Accessibility className="size-4" />,
  telephone: <Phone className="size-4" />,
  cctv: <Camera className="size-4" />,
  laundry: <Shirt className="size-4" />,
  blanchisserie: <Shirt className="size-4" />,
};

function getIconForAmenity(amenity: string): React.ReactNode {
  const key = amenity.toLowerCase().replace(/[\s_]+/g, '-');
  if (ICON_MAP[key]) return ICON_MAP[key];
  // Partial match
  for (const [k, icon] of Object.entries(ICON_MAP)) {
    if (key.includes(k) || k.includes(key)) return icon;
  }
  return <Sparkles className="size-4" />;
}

// ── Compact strip for cards ─────────────────────────────────────────────────

interface AmenityStripProps {
  amenities: string[];
  max?: number;
  className?: string;
}

export function AmenityStrip({ amenities, max = 5, className }: AmenityStripProps) {
  const shown = amenities.slice(0, max);
  const remaining = amenities.length - shown.length;
  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {shown.map((a) => (
        <div
          key={a}
          title={a}
          className="flex items-center justify-center size-7 rounded-lg bg-white/[0.05] border border-white/[0.06] text-neutral-400 hover:text-amber-400 hover:border-amber-400/20 transition-colors"
        >
          {getIconForAmenity(a)}
        </div>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-neutral-600 font-medium">+{remaining}</span>
      )}
    </div>
  );
}

// ── Full grid for hotel detail page ────────────────────────────────────────

interface HotelAmenitiesGridProps {
  amenities: string[];
  className?: string;
}

export function HotelAmenitiesGrid({ amenities, className }: HotelAmenitiesGridProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-3', className)}>
      {amenities.map((amenity) => (
        <div
          key={amenity}
          className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm text-neutral-300"
        >
          <div className="shrink-0 flex items-center justify-center size-8 rounded-lg bg-amber-400/10 text-amber-400">
            {getIconForAmenity(amenity)}
          </div>
          <span className="capitalize leading-tight">{amenity}</span>
        </div>
      ))}
    </div>
  );
}

// ── Room amenities chips ────────────────────────────────────────────────────

interface RoomAmenityChipsProps {
  amenities: string[];
  className?: string;
}

export function RoomAmenityChips({ amenities, className }: RoomAmenityChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {amenities.map((a) => (
        <span
          key={a}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300"
        >
          <span className="text-neutral-500 [&_svg]:size-3">{getIconForAmenity(a)}</span>
          {a}
        </span>
      ))}
    </div>
  );
}
