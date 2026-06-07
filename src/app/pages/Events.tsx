import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Calendar, Clock, MapPin, Music } from 'lucide-react';
import { Container, SectionTitle, Card, Button } from '../components/design-system';
import { Badge } from '../components/design-system/Badge';
import { eventsAPI, type Event } from '../services/api';
import { CITIES } from '../constants/cities';

const eventTypes = [
  { value: '', label: 'Tous' },
  { value: 'DJ', label: 'DJ' },
  { value: 'Chanteur', label: 'Chanteur' },
  { value: 'Concert', label: 'Concert' },
];

export function Events() {
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');

  const filters = {
    city: city || undefined,
    type: type || undefined,
  };
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsAPI.getAll(filters),
  });

  const filtered = date
    ? events.filter((e) => new Date(e.startAt).toISOString().split('T')[0] === date)
    : events;

  const clearFilters = () => {
    setCity('');
    setDate('');
    setType('');
  };
  const activeCount = [city, date, type].filter(Boolean).length;

  const getVenueId = (e: Event) => (typeof e.venueId === 'object' ? e.venueId._id : e.venueId);
  const getVenueName = (e: Event) => (typeof e.venueId === 'object' ? e.venueId.name : '');
  const getVenueCity = (e: Event) => (typeof e.venueId === 'object' ? e.venueId.city : '');

  return (
    <div className="py-8 md:py-12">
      <Container>
        <SectionTitle subtitle="Concerts, DJ sets et spectacles en Tunisie">Événements</SectionTitle>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-72 shrink-0">
            <Card className="p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-landing-text font-semibold">Filtres</h3>
                {activeCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-sm text-landing-gold hover:text-landing-gold-light">Réinitialiser</button>
                )}
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Ville</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold">
                    <option value="">Toutes</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold" />
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold">
                    {eventTypes.map((t) => (
                      <option key={t.value || 'all'} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          </aside>
          <div className="flex-1 min-w-0">
            <p className="text-landing-text-muted text-sm mb-6">{filtered.length} événement{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</p>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-landing-gold border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-landing-text-muted">Chargement...</p>
              </div>
            ) : error ? (
              <Card className="p-12 text-center">
                <p className="text-landing-text-muted mb-4">Erreur lors du chargement.</p>
                <Button variant="secondary" onClick={clearFilters}>Réessayer</Button>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-landing-text-muted mb-4">Aucun événement ne correspond à vos critères.</p>
                <Button variant="secondary" onClick={clearFilters}>Réinitialiser</Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filtered.map((ev) => {
                  const start = new Date(ev.startAt);
                  return (
                    <Link key={ev._id} to={`/lieu/${getVenueId(ev)}`} className="group block rounded-xl overflow-hidden border border-landing-border bg-landing-card hover:border-landing-gold/50 transition-all">
                      <div className="relative h-48 overflow-hidden bg-landing-bg">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Music className="w-16 h-16 text-landing-gold/40" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-landing-bg/90 via-landing-bg/20 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <Badge variant="event">{ev.type}</Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-landing-text font-semibold text-lg">{ev.title}</h3>
                          <p className="text-landing-text-muted text-sm flex items-center gap-1 mt-1">
                            <Music className="w-4 h-4" />
                            {getVenueName(ev)} · {getVenueCity(ev)}
                          </p>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex flex-wrap gap-3 text-sm text-landing-text-muted mb-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {getVenueCity(ev)}
                          </span>
                        </div>
                        <p className="text-landing-text-muted text-sm line-clamp-2 mb-4">{ev.description}</p>
                        <span className="text-landing-gold font-medium text-sm group-hover:underline">Voir le lieu →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
