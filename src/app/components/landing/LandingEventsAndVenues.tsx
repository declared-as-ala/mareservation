import { Link } from 'react-router';
import { ArrowRight, MapPin, Calendar, Star, Music } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { venuesAPI, eventsAPI, type Venue, type Event } from '../../services/api';

function getVenueImage(v: Venue): string {
  const hero = v.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
}

function EventSkeleton() {
  return (
    <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden animate-pulse">
      <div className="h-40 bg-landing-bg/50" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-landing-bg/50 rounded w-3/4" />
        <div className="h-4 bg-landing-bg/50 rounded w-1/2" />
      </div>
    </div>
  );
}

function VenueSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-landing-border bg-landing-card animate-pulse">
      <div className="h-56 bg-landing-bg/50" />
      <div className="p-6 space-y-3">
        <div className="h-6 bg-landing-bg/50 rounded w-2/3" />
        <div className="h-4 bg-landing-bg/50 rounded w-1/2" />
        <div className="h-4 bg-landing-bg/50 rounded w-1/3" />
      </div>
    </div>
  );
}

export function LandingEventsAndVenues() {
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsAPI.getAll({ upcoming: true }),
  });
  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ['venues', 'featured'],
    queryFn: () => venuesAPI.getAll(),
  });
  const upcomingEvents = events.slice(0, 4);
  const featuredVenues = venues.slice(0, 6);

  return (
    <>
      <section className="py-16 border-t border-landing-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-landing-text text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Événements à venir
            </h2>
            <Link to="/evenements" className="text-landing-gold hover:text-landing-gold-light flex items-center gap-2 text-sm font-medium">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {eventsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => <EventSkeleton key={i} />)}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-landing-text-muted text-center py-8">Aucun événement à venir.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcomingEvents.map((ev) => {
                const venue = typeof ev.venueId === 'object' ? ev.venueId : null;
                const venueId = venue?._id ?? (typeof ev.venueId === 'string' ? ev.venueId : null);
                const venueName = venue?.name ?? '';
                return (
                  <Link
                    key={ev._id}
                    to={venueId ? `/lieu/${venueId}` : '/evenements'}
                    className="group rounded-xl border border-landing-border bg-landing-card overflow-hidden hover:border-landing-gold/50 transition-all"
                  >
                    <div className="h-36 bg-landing-gold/10 flex items-center justify-center">
                      <Music className="w-12 h-12 text-landing-gold/50" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-landing-text group-hover:text-landing-gold truncate">{ev.title}</h3>
                      <p className="text-sm text-landing-text-muted mt-1">
                        {new Date(ev.startAt).toLocaleDateString('fr-FR')}{venueName ? ` · ${venueName}` : ''}
                      </p>
                      <span className="inline-block mt-2 text-landing-gold text-sm font-medium">Voir →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-landing-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-landing-text text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Lieux populaires
            </h2>
            <Link to="/explorer" className="text-landing-gold hover:text-landing-gold-light flex items-center gap-2 text-sm font-medium">
              Voir tous les lieux <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {venuesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => <VenueSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredVenues.map((venue) => (
                <Link
                  key={venue._id}
                  to={`/lieu/${venue._id}`}
                  className="group rounded-xl overflow-hidden border border-landing-border bg-landing-card hover:border-landing-gold/50 hover:shadow-lg transition-all"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={getVenueImage(venue)}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {venue.hasEvent && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-landing-gold text-[#161616] rounded-full text-xs font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Événement
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-landing-text font-semibold text-lg">{venue.name}</h3>
                      <div className="flex items-center gap-1 text-landing-gold">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{venue.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-landing-text-muted text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{venue.city}</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-landing-border text-sm">
                      <span className="text-landing-text-muted">{venue.availableTables ?? 0} tables</span>
                      <span className="font-medium text-landing-gold">À partir de {venue.startingPrice} TND</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
