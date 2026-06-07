import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Container, SectionTitle, Card, Button } from '../components/design-system';
import { VenueCard } from '../components/VenueCard';
import { venuesAPI, type Venue } from '../services/api';
import { CITIES } from '../constants/cities';

function getVenueImage(v: Venue): string {
  const hero = v.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80';
}

export function Cafes() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [hasEvent, setHasEvent] = useState(false);
  const [maxPrice, setMaxPrice] = useState<string>('');

  const filters = { type: 'cafe', city: city || undefined, hasEvent: hasEvent || undefined };
  const { data: venues = [], isLoading, error } = useQuery({
    queryKey: ['venues', filters],
    queryFn: () => venuesAPI.getAll(filters),
  });

  const filtered = [...venues]
    .filter((v) => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase()))
    .filter((v) => !maxPrice || Number(maxPrice) <= 0 || v.startingPrice <= Number(maxPrice));

  const clearFilters = () => {
    setCity('');
    setHasEvent(false);
    setMaxPrice('');
    setSearch('');
  };
  const activeCount = [city, hasEvent, maxPrice].filter(Boolean).length;

  return (
    <div className="py-8 md:py-12">
      <Container>
        <SectionTitle subtitle="Découvrez les meilleurs cafés en Tunisie">Cafés</SectionTitle>
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-landing-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, ville..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-landing-card border border-landing-border text-landing-text placeholder-landing-text-muted/60 focus:outline-none focus:ring-2 focus:ring-landing-gold"
            />
          </div>
        </div>
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasEvent} onChange={(e) => setHasEvent(e.target.checked)} className="w-4 h-4 rounded border-landing-border text-landing-gold focus:ring-landing-gold" />
                  <span className="text-sm text-landing-text">Événement ce soir</span>
                </label>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Prix max (TND)</label>
                  <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="50" min={0} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold" />
                </div>
              </div>
            </Card>
          </aside>
          <div className="flex-1 min-w-0">
            <p className="text-landing-text-muted text-sm mb-6">{filtered.length} café{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</p>
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
                <p className="text-landing-text-muted mb-4">Aucun café ne correspond à vos critères.</p>
                <Button variant="secondary" onClick={clearFilters}>Réinitialiser</Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((v) => (
                  <VenueCard
                    key={v._id}
                    venue={{
                      id: v._id,
                      name: v.name,
                      type: v.type,
                      city: v.city,
                      rating: v.rating,
                      availableTables: v.availableTables ?? 0,
                      priceFrom: v.startingPrice,
                      hasEvent: v.hasEvent,
                      image: getVenueImage(v),
                      description: v.description,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
