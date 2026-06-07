import { Link } from 'react-router';
import { MapPin, Star, Calendar } from 'lucide-react';
import { Badge } from './design-system/Badge';
import { VENUE_TYPE_LABELS } from '../constants/venueTypes';

export interface VenueCardData {
  id: string;
  name: string;
  type: string;
  city: string;
  rating: number;
  availableTables: number;
  priceFrom: number;
  hasEvent?: boolean;
  image: string;
  description?: string;
}

interface VenueCardProps {
  venue: VenueCardData;
}

const typeLabels: Record<string, string> = {
  ...VENUE_TYPE_LABELS,
  restaurant: 'Restaurant',
  cafe: 'Café',
  hotel: 'Hôtel',
  beach_club: 'Beach Club',
  spa: 'Spa',
};

export function VenueCard({ venue }: VenueCardProps) {
  const imageUrl = venue.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
  return (
    <Link
      to={`/lieu/${venue.id}`}
      className="group block rounded-xl overflow-hidden border border-landing-border bg-landing-card hover:border-landing-gold/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={imageUrl}
          alt={venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-landing-bg/80 via-transparent to-transparent" />
        {venue.hasEvent && (
          <div className="absolute top-3 right-3">
            <Badge variant="event">
              <Calendar className="w-3.5 h-3.5" />
              Événement ce soir
            </Badge>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="px-2 py-1 rounded bg-landing-card/90 text-landing-text text-xs font-medium">
            {typeLabels[venue.type] || venue.type}
          </span>
          <div className="flex items-center gap-1 text-landing-gold">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-medium text-sm">{venue.rating}</span>
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-landing-text font-semibold text-lg mb-1 group-hover:text-landing-gold transition-colors">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 text-landing-text-muted text-sm mb-3">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{venue.city}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-landing-border">
          <span className="text-landing-text-muted text-sm">
            Tables disponibles : {venue.availableTables}
          </span>
          <span className="text-landing-gold font-semibold">
            À partir de {venue.priceFrom} TND
          </span>
        </div>
        <span className="mt-3 inline-block text-sm text-landing-gold font-medium group-hover:underline">
          Voir le lieu →
        </span>
      </div>
    </Link>
  );
}
