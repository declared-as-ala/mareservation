import { ArrowRight, Eye, MousePointer, CheckCircle, MapPin, Calendar, Star, Music } from 'lucide-react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { venuesAPI, eventsAPI, type Venue, type Event } from '../services/api';

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
        <div className="h-4 bg-landing-bg/50 rounded w-full" />
      </div>
    </div>
  );
}

function VenueCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-landing-border bg-landing-card animate-pulse">
      <div className="h-56 bg-landing-bg/50" />
      <div className="p-6 space-y-3">
        <div className="h-6 bg-landing-bg/50 rounded w-2/3" />
        <div className="h-4 bg-landing-bg/50 rounded w-1/2" />
        <div className="h-4 bg-landing-bg/50 rounded w-full" />
        <div className="h-4 bg-landing-bg/50 rounded w-1/3" />
      </div>
    </div>
  );
}

export function Home() {
  const { data: venues = [], isLoading: venuesLoading, error: venuesError } = useQuery({
    queryKey: ['venues', 'featured'],
    queryFn: () => venuesAPI.getAll(),
  });
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsAPI.getAll(),
  });
  const featuredVenues = venues.slice(0, 6);
  const upcomingEvents = events.slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-6xl mb-6">
            Réservez la table parfaite avant d'arriver
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Découvrez, explorez en vue 360° et choisissez votre table en toute confiance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/explorer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all transform hover:scale-105"
            >
              Explorer les lieux
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/proposer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-all"
            >
              Proposer mon établissement
            </Link>
          </div>
        </div>
      </section>

      {/* Tagline Section */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-2xl md:text-3xl font-light italic">
            « Choisissez votre table. Vivez l'instant. »
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center mb-16">Comment ça marche</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <Eye className="w-10 h-10 text-accent" />
              </div>
              <h3 className="mb-4">Explorez un lieu</h3>
              <p className="text-muted-foreground">
                Parcourez notre sélection de restaurants, cafés et lieux d'événements à travers la Tunisie.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                  <path d="M8 12h8" />
                </svg>
              </div>
              <h3 className="mb-4">Découvrez-le en 360°</h3>
              <p className="text-muted-foreground">
                Explorez l'intérieur du lieu avec notre vue immersive à 360° avant de vous déplacer.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <MousePointer className="w-10 h-10 text-accent" />
              </div>
              <h3 className="mb-4">Choisissez votre table</h3>
              <p className="text-muted-foreground">
                Sélectionnez la table parfaite selon vos préférences : près de la fenêtre, de la scène, ou en terrasse.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-success/10 text-success rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Confirmation instantanée par email et SMS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Événements à venir */}
      <section className="py-16 bg-landing-bg border-t border-landing-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-landing-text text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Événements à venir</h2>
            <Link to="/evenements" className="text-landing-gold hover:text-landing-gold-light flex items-center gap-2 text-sm font-medium">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {eventsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => <EventSkeleton key={i} />)}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-landing-text-muted text-center py-8">Aucun événement à venir pour le moment.</p>
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
                      <p className="text-sm text-landing-text-muted mt-1">{new Date(ev.startAt).toLocaleDateString('fr-FR')}{venueName ? ` · ${venueName}` : ''}</p>
                      <span className="inline-block mt-2 text-landing-gold text-sm font-medium">Voir →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Lieux populaires */}
      <section className="py-20 bg-landing-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-landing-text text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Lieux populaires</h2>
            <Link to="/explorer" className="text-landing-gold hover:text-landing-gold-light flex items-center gap-2 text-sm font-medium">
              Voir tous les lieux <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {venuesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => <VenueCardSkeleton key={i} />)}
            </div>
          ) : venuesError ? (
            <p className="text-center py-12 text-red-400">Erreur lors du chargement.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredVenues.map((venue) => (
                <Link
                  key={venue._id}
                  to={`/lieu/${venue._id}`}
                  className="group rounded-xl overflow-hidden border border-landing-border bg-landing-card hover:border-landing-gold/50 hover:shadow-lg transition-all"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img src={getVenueImage(venue)} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="mb-6">Vous êtes propriétaire d'un restaurant ou café ?</h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Rejoignez Ma Reservation et augmentez votre visibilité auprès de milliers de clients potentiels.
          </p>
          <Link
            to="/proposer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all transform hover:scale-105"
          >
            Proposer mon établissement
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
