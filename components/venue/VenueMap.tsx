import { MapPin, ExternalLink } from 'lucide-react';

interface VenueMapProps {
  address: string;
  city: string;
  coordinates?: { lat?: number; lng?: number } | null;
}

export function VenueMap({ address, city, coordinates }: VenueMapProps) {
  const lat = coordinates?.lat;
  const lng = coordinates?.lng;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';

  const addressQuery = encodeURIComponent(`${address}, ${city}, Tunisia`);
  const coordQuery = hasCoords ? `${lat},${lng}` : null;

  const mapsUrl = coordQuery
    ? `https://www.google.com/maps?q=${coordQuery}`
    : `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

  const embedSrc = coordQuery
    ? `https://www.google.com/maps?q=${coordQuery}&output=embed&z=15`
    : `https://maps.google.com/maps?q=${addressQuery}&output=embed&z=15`;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
        <iframe
          title="Localisation du lieu"
          src={embedSrc}
          width="100%"
          height="256"
          className="w-full block"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-amber-400" />
          {address}, {city}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          Voir sur Google Maps
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
