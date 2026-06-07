'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminVenues,
  fetchAdminEvents,
  updateAdminVenue,
  updateAdminEvent,
} from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Search, MapPin, CalendarDays, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

type VenueRow = {
  _id: string;
  name: string;
  city?: string;
  type?: string;
  isPublished?: boolean;
  isVedette?: boolean;
  vedetteOrder?: number;
  coverImage?: string;
};

type EventRow = {
  _id: string;
  title: string;
  type?: string;
  startAt?: string;
  isPublished?: boolean;
  isVedette?: boolean;
  coverImage?: string;
  imageUrl?: string;
};

const TYPE_LABELS: Record<string, string> = {
  CAFE: 'Cafés',
  RESTAURANT: 'Restaurants',
  HOTEL: 'Hôtels',
  CINEMA: 'Cinéma',
  EVENT_SPACE: 'Salles',
};

function VenueImage({ venue }: { venue: VenueRow }) {
  if (venue.coverImage) {
    return (
      <div className="size-10 rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
        <Image src={venue.coverImage} alt={venue.name} fill className="object-cover" sizes="40px" />
      </div>
    );
  }
  return (
    <div className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20 shrink-0">
      <MapPin className="size-4" />
    </div>
  );
}

function EventImage({ event }: { event: EventRow }) {
  if (event.coverImage || event.imageUrl) {
    return (
      <div className="size-10 rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
        <Image src={(event.coverImage ?? event.imageUrl)!} alt={event.title} fill className="object-cover" sizes="40px" />
      </div>
    );
  }
  return (
    <div className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20 shrink-0">
      <CalendarDays className="size-4" />
    </div>
  );
}

export default function AdminVedettePage() {
  const qc = useQueryClient();
  const [venueSearch, setVenueSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [activeTab, setActiveTab] = useState('venues');

  const { data: rawVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ['admin', 'venues', 'all'],
    queryFn: () => fetchAdminVenues(),
  });
  const venues = rawVenues as VenueRow[];

  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'events', 'all'],
    queryFn: () => fetchAdminEvents(),
  });
  const events = rawEvents as EventRow[];

  const venueMut = useMutation({
    mutationFn: ({ id, isVedette, vedetteOrder }: { id: string; isVedette?: boolean; vedetteOrder?: number }) =>
      updateAdminVenue(id, { isVedette, vedetteOrder }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'venues', 'all'] });
      toast.success('Mis à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  const eventMut = useMutation({
    mutationFn: ({ id, isVedette }: { id: string; isVedette: boolean }) =>
      updateAdminEvent(id, { isVedette }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'events', 'all'] });
      toast.success('Mis à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    (v.city ?? '').toLowerCase().includes(venueSearch.toLowerCase())
  );
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const vedetteVenuesCount = venues.filter((v) => v.isVedette).length;
  const vedetteEventsCount = events.filter((e) => e.isVedette).length;

  // Group venues by type for vedette management
  const venuesByType = filteredVenues.reduce<Record<string, VenueRow[]>>((acc, v) => {
    const type = v.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(v);
    return acc;
  }, {});

  function moveVenue(venue: VenueRow, direction: 'up' | 'down') {
    const typeGroup = venuesByType[venue.type || 'OTHER'] || [];
    const vedetteInGroup = typeGroup.filter((v) => v.isVedette).sort((a, b) => (a.vedetteOrder ?? 0) - (b.vedetteOrder ?? 0));
    const idx = vedetteInGroup.findIndex((v) => v._id === venue._id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= vedetteInGroup.length) return;
    const currentOrder = venue.vedetteOrder ?? 0;
    const swapVenue = vedetteInGroup[newIdx];
    const swapOrder = swapVenue.vedetteOrder ?? 0;
    venueMut.mutate({ id: venue._id, vedetteOrder: swapOrder });
    venueMut.mutate({ id: swapVenue._id, vedetteOrder: currentOrder });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Lieux en vedette</h1>
        <p className="text-sm text-white/40 mt-1">
          Sélectionnez les lieux et événements à mettre en avant par catégorie sur la page d&apos;accueil
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Lieux en vedette</p>
                <p className="text-2xl font-bold text-white">{vedetteVenuesCount}</p>
              </div>
              <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-400/20">
                <Star className="size-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Événements en vedette</p>
                <p className="text-2xl font-bold text-white">{vedetteEventsCount}</p>
              </div>
              <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-400/20">
                <CalendarDays className="size-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-white/[0.03] border border-white/[0.06]">
          <TabsTrigger value="venues" className="gap-2 data-[state=active]:bg-white/[0.06]">
            <MapPin className="size-3.5" />
            Lieux
            {vedetteVenuesCount > 0 && (
              <Badge className="ml-1 text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-400 border-amber-500/20">{vedetteVenuesCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2 data-[state=active]:bg-white/[0.06]">
            <CalendarDays className="size-3.5" />
            Événements
            {vedetteEventsCount > 0 && (
              <Badge className="ml-1 text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-400 border-amber-500/20">{vedetteEventsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Venues tab — grouped by category */}
        <TabsContent value="venues">
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base text-white">
                  {filteredVenues.length} lieu{filteredVenues.length !== 1 ? 'x' : ''}
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    placeholder="Rechercher..."
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    className="pl-9 h-9 text-sm w-[220px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:border-amber-400/50 focus:ring-amber-400/20"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {venuesLoading ? (
                <div className="space-y-0 divide-y divide-white/[0.04]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <Skeleton className="size-10 rounded-lg bg-white/5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40 bg-white/5" />
                        <Skeleton className="h-3 w-24 bg-white/5" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full bg-white/5" />
                    </div>
                  ))}
                </div>
              ) : filteredVenues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/30">
                  <MapPin className="size-8 mb-3" />
                  <p className="text-sm font-medium text-white/40">Aucun lieu trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {Object.entries(venuesByType).map(([type, typeVenues]) => (
                    <div key={type}>
                      {/* Category header */}
                      <div className="px-5 py-2.5 bg-white/[0.02] flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 text-white/40 border-white/10">
                          {TYPE_LABELS[type] || type}
                        </Badge>
                        <span className="text-[10px] text-white/20">
                          {typeVenues.filter((v) => v.isVedette).length} en vedette
                        </span>
                      </div>

                      {/* Venues in this category */}
                      {typeVenues.map((venue) => (
                        <div key={venue._id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                          <VenueImage venue={venue} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/80 truncate">{venue.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {venue.city && <span className="text-[11px] text-white/30">{venue.city}</span>}
                              {venue.isVedette && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  <Star className="size-2.5 mr-0.5" />
                                  Vedette
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Vedette toggle */}
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-white/30">Vedette</span>
                              <Switch
                                checked={!!venue.isVedette}
                                onCheckedChange={(v) => venueMut.mutate({ id: venue._id, isVedette: v, vedetteOrder: v ? (typeVenues.filter((vv) => vv.isVedette).length) : undefined })}
                                disabled={venueMut.isPending}
                                className="data-[state=checked]:bg-amber-500"
                              />
                            </div>

                            {/* Order arrows (only when vedette) */}
                            {venue.isVedette && (
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => moveVenue(venue, 'up')}
                                  className="p-0.5 rounded text-white/20 hover:text-amber-400 transition-colors"
                                  aria-label="Monter"
                                >
                                  <ArrowUp className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveVenue(venue, 'down')}
                                  className="p-0.5 rounded text-white/20 hover:text-amber-400 transition-colors"
                                  aria-label="Descendre"
                                >
                                  <ArrowDown className="size-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events tab */}
        <TabsContent value="events">
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base text-white">
                  {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''}
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    placeholder="Rechercher..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="pl-9 h-9 text-sm w-[220px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:border-amber-400/50 focus:ring-amber-400/20"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {eventsLoading ? (
                <div className="space-y-0 divide-y divide-white/[0.04]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <Skeleton className="size-10 rounded-lg bg-white/5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 bg-white/5" />
                        <Skeleton className="h-3 w-28 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/30">
                  <CalendarDays className="size-8 mb-3" />
                  <p className="text-sm font-medium text-white/40">Aucun événement trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {filteredEvents.map((event) => (
                    <div key={event._id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      <EventImage event={event} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.type && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 text-white/30 border-white/10">{event.type}</Badge>
                          )}
                          {event.startAt && (
                            <span className="text-[11px] text-white/30">
                              {new Date(event.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {event.isVedette && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                              <Star className="size-2.5 mr-0.5" />
                              Vedette
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-[10px] text-white/30">Vedette</span>
                        <Switch
                          checked={!!event.isVedette}
                          onCheckedChange={(v) => eventMut.mutate({ id: event._id, isVedette: v })}
                          disabled={eventMut.isPending}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
