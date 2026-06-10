import type { ComponentType } from 'react';
import {
  Info,
  Image as ImageIcon,
  UtensilsCrossed,
  Coffee,
  Armchair,
  BriefcaseBusiness,
  Clapperboard,
  PartyPopper,
  Globe2,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

export type VenueCategoryKey = 'RESTAURANT' | 'CAFE' | 'COWORKING' | 'CINEMA' | 'EVENT_SPACE';

export type SectionKey = 'infos' | 'photos' | 'menu' | 'tables' | 'spaces' | 'tour' | 'reservations' | 'events';

export interface VenueTab {
  key: SectionKey;
  label: string;
  Icon: LucideIcon;
}

export interface VenueCategoryConfig {
  /** Singular label shown in the hero badge. */
  label: string;
  /** Plural label shown on the list page. */
  labelPlural: string;
  Icon: LucideIcon;
  /** Tailwind text + soft-bg accent classes for the category. */
  accentText: string;
  accentBg: string;
  tabs: VenueTab[];
}

const COMMON_TAIL: VenueTab[] = [
  { key: 'tour', label: 'Visite 360°', Icon: Globe2 },
  { key: 'reservations', label: 'Réservations', Icon: CalendarDays },
];
const HEAD: VenueTab[] = [
  { key: 'infos', label: 'Infos', Icon: Info },
  { key: 'photos', label: 'Photos', Icon: ImageIcon },
];

export const VENUE_CATEGORY_CONFIG: Record<VenueCategoryKey, VenueCategoryConfig> = {
  RESTAURANT: {
    label: 'Restaurant',
    labelPlural: 'Restaurants',
    Icon: UtensilsCrossed,
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-500/20',
    tabs: [
      ...HEAD,
      { key: 'menu', label: 'Menu', Icon: UtensilsCrossed },
      { key: 'tables', label: 'Tables & 360°', Icon: Armchair },
      ...COMMON_TAIL,
    ],
  },
  CAFE: {
    label: 'Café',
    labelPlural: 'Cafés',
    Icon: Coffee,
    accentText: 'text-orange-300',
    accentBg: 'bg-orange-500/20',
    tabs: [
      ...HEAD,
      { key: 'menu', label: 'Carte', Icon: Coffee },
      { key: 'tables', label: 'Tables & 360°', Icon: Armchair },
      ...COMMON_TAIL,
    ],
  },
  COWORKING: {
    label: 'Coworking',
    labelPlural: 'Espaces coworking',
    Icon: BriefcaseBusiness,
    accentText: 'text-sky-300',
    accentBg: 'bg-sky-500/20',
    tabs: [
      ...HEAD,
      { key: 'spaces', label: 'Espaces & 360°', Icon: BriefcaseBusiness },
      ...COMMON_TAIL,
    ],
  },
  CINEMA: {
    label: 'Cinéma',
    labelPlural: 'Cinémas',
    Icon: Clapperboard,
    accentText: 'text-blue-300',
    accentBg: 'bg-blue-500/20',
    tabs: [...HEAD, { key: 'events', label: 'Séances & Films', Icon: Clapperboard }, ...COMMON_TAIL],
  },
  EVENT_SPACE: {
    label: 'Espace événementiel',
    labelPlural: 'Espaces événementiels',
    Icon: PartyPopper,
    accentText: 'text-fuchsia-300',
    accentBg: 'bg-fuchsia-500/20',
    tabs: [...HEAD, { key: 'events', label: 'Programme', Icon: PartyPopper }, ...COMMON_TAIL],
  },
};

export type { ComponentType };
