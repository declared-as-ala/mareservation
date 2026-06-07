import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import { Container, SectionTitle, Card, Button } from '../components/design-system';
import { VenueCard } from '../components/VenueCard';
import { venuesAPI, type Venue } from '../services/api';
import { CITIES } from '../constants/cities';
import { CATEGORIES } from '../constants/categories';
import { EXPLORER_TYPE_OPTIONS } from '../constants/venueTypes';

const bookingTypeFilters = [
  { value: '', label: 'Tous' },
  { value: 'table', label: 'Table' },
  { value: 'event', label: 'Événement' },
  { value: 'room', label: 'Chambre' },
] as const;

function getVenueImage(v: Venue): string {
  const hero = v.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
}

export function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get('q') ?? '';
  const typeFromUrl = searchParams.get('type') ?? '';
  const cityFromUrl = searchParams.get('city') ?? '';
  const [search, setSearch] = useState(qFromUrl);
  const [city, setCity] = useState(cityFromUrl);
  const [type, setType] = useState(typeFromUrl);
  const [hasEvent, setHasEvent] = useState(false);
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>('');

  useEffect(() => {
    setSearch((s) => (qFromUrl && s !== qFromUrl ? qFromUrl : s));
  }, [qFromUrl]);
  useEffect(() => {
    setType((t) => (typeFromUrl !== t ? typeFromUrl : t));
  }, [typeFromUrl]);
  useEffect(() => {
    setCity((c) => (cityFromUrl !== c ? cityFromUrl : c));
  }, [cityFromUrl]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (type) next.set('type', type); else next.delete('type');
    if (city) next.set('city', city); else next.delete('city');
    setSearchParams(next, { replace: true });
  }, [type, city]);

  const filters = {
    type: type || undefined,
    city: city || undefined,
    hasEvent: hasEvent || undefined,
  };
  const { data: venues = [], isLoading, error } = useQuery({
    queryKey: ['venues', filters],
    queryFn: () => venuesAPI.getAll(filters),
  });

  const filteredBySearch = search
    ? venues.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.city.toLowerCase().includes(search.toLowerCase()) ||
          v.description?.toLowerCase().includes(search.toLowerCase())
      )
    : venues;
  const filteredByPrice =
    maxPrice && Number(maxPrice) > 0
      ? filteredBySearch.filter((v) => v.startingPrice <= Number(maxPrice))
      : filteredBySearch;

  const filteredByBookingType =
    bookingTypeFilter === 'event'
      ? filteredByPrice.filter((v) => v.hasEvent)
      : bookingTypeFilter === 'room'
        ? filteredByPrice.filter((v) => v.type === 'HOTEL')
        : filteredByPrice;

  const clearFilters = () => {
    setCity('');
    setType('');
    setHasEvent(false);
    setMaxPrice('');
    setSearch('');
    setBookingTypeFilter('');
  };

  const activeCount = [city, type, hasEvent, maxPrice, bookingTypeFilter].filter(Boolean).length;

  return (
    <div className="py-8 md:py-12">
      <Container>
        <SectionTitle subtitle="Découvrez les meilleurs restaurants, cafés et lieux en Tunisie">
          Explorer les lieux
        </SectionTitle>

        <div className="mb-6">
          <p className="text-landing-text-muted text-sm mb-3">Catégories</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setType(type === c.type ? '' : c.type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  type === c.type
                    ? 'bg-landing-gold text-[#161616]'
                    : 'bg-landing-card border border-landing-border text-landing-text hover:border-landing-gold/50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

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
                  <button type="button" onClick={clearFilters} className="text-sm text-landing-gold hover:text-landing-gold-light">
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Ville</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                  >
                    <option value="">Toutes</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                  >
                    {EXPLORER_TYPE_OPTIONS.map((t) => (
                      <option key={t.value || 'all'} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Type de réservation</label>
                  <select
                    value={bookingTypeFilter}
                    onChange={(e) => setBookingTypeFilter(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                  >
                    {bookingTypeFilters.map((b) => (
                      <option key={b.value || 'all'} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEvent}
                    onChange={(e) => setHasEvent(e.target.checked)}
                    className="w-4 h-4 rounded border-landing-border text-landing-gold focus:ring-landing-gold"
                  />
                  <span className="text-sm text-landing-text">Avec événement</span>
                </label>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">Prix max (TND)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="100"
                    min={0}
                    className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text placeholder-landing-text-muted/60 focus:ring-2 focus:ring-landing-gold"
                  />
                </div>
              </div>
            </Card>
          </aside>

          <div className="flex-1 min-w-0">
            {activeCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-landing-text-muted text-sm">Filtres :</span>
                {type && (
                  <span className="px-3 py-1 rounded-full text-sm bg-landing-gold/20 text-landing-gold border border-landing-gold/40">
                    {EXPLORER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}
                  </span>
                )}
                {city && (
                  <span className="px-3 py-1 rounded-full text-sm bg-landing-gold/20 text-landing-gold border border-landing-gold/40">
                    {city}
                  </span>
                )}
                {hasEvent && (
                  <span className="px-3 py-1 rounded-full text-sm bg-landing-gold/20 text-landing-gold border border-landing-gold/40">
                    Avec événement
                  </span>
                )}
                {maxPrice && Number(maxPrice) > 0 && (
                  <span className="px-3 py-1 rounded-full text-sm bg-landing-gold/20 text-landing-gold border border-landing-gold/40">
                    Max {maxPrice} TND
                  </span>
                )}
                {bookingTypeFilter && (
                  <span className="px-3 py-1 rounded-full text-sm bg-landing-gold/20 text-landing-gold border border-landing-gold/40">
                    {bookingTypeFilters.find((b) => b.value === bookingTypeFilter)?.label ?? bookingTypeFilter}
                  </span>
                )}
              </div>
            )}
            <p className="text-landing-text-muted text-sm mb-6">
              {filteredByBookingType.length} lieu{filteredByBookingType.length !== 1 ? 'x' : ''} trouvé{filteredByBookingType.length !== 1 ? 's' : ''}
            </p>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-landing-gold border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-landing-text-muted">Chargement...</p>
              </div>
            ) : error ? (
              <Card className="p-12 text-center">
                <p className="text-landing-text-muted mb-4">Erreur lors du chargement des lieux.</p>
                <Button variant="secondary" onClick={clearFilters}>Réessayer</Button>
              </Card>
            ) : filteredByBookingType.length === 0 ? (
              <Card className="p-12 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-landing-text-muted opacity-50" />
                <p className="text-landing-text-muted mb-4">Aucun lieu ne correspond à vos critères.</p>
                <Button variant="secondary" onClick={clearFilters}>Réinitialiser les filtres</Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredByBookingType.map((v) => (
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
