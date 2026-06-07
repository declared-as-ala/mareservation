import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Star, Calendar, Users, ArrowRight, Clock, Music, MousePointer } from 'lucide-react';
import { venuesAPI, tablesAPI, reservationsAPI, type Venue, type Table, type Room, type Seat, type Event } from '../services/api';
import { KlaptyEmbed } from '../components/KlaptyEmbed';
import { TableHotspotOverlay } from '../components/TableHotspotOverlay';
import { TourHotspotOverlay } from '../components/TourHotspotOverlay';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ReservationConfirmModal } from '../components/ReservationConfirmModal';
import { VENUE_TYPE_LABELS } from '../constants/venueTypes';

function getHeroImage(venue: Venue): string {
  const hero = venue.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
}

/** Only TOUR_360_EMBED_URL (tunnel) is used for Klapty iframe. Never use TOUR_360_VIDEO here (may be storage.klapty.com). */
function getTour360EmbedUrl(venue: Venue): string | null {
  const embed = venue.media?.find((m) => m.kind === 'TOUR_360_EMBED_URL');
  return embed?.url ?? null;
}

export function VenueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openAuthRequired } = useUIStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultDate = today.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedTime, setSelectedTime] = useState<string>('20:00');
  const [selectedGuests, setSelectedGuests] = useState<number>(2);
  const [tableModalTable, setTableModalTable] = useState<Table | null>(null);

  const { data: venueBase, error: errorBase } = useQuery({
    queryKey: ['venue', id],
    queryFn: () => venuesAPI.getById(id!),
    enabled: !!id,
  });
  const venueTypeForRange = venueBase?.type;
  const startAt = selectedDate
    ? venueTypeForRange === 'HOTEL'
      ? `${selectedDate}T15:00:00.000Z`
      : selectedTime
        ? `${selectedDate}T${selectedTime}:00.000Z`
        : undefined
    : undefined;
  const endAt = startAt
    ? venueTypeForRange === 'HOTEL'
      ? (() => {
          const d = new Date(selectedDate!);
          d.setDate(d.getDate() + 1);
          d.setUTCHours(11, 0, 0, 0);
          return d.toISOString();
        })()
      : new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
    : undefined;
  const { data: venueWithAvailability, error: errorAvail } = useQuery({
    queryKey: ['venue', id, startAt, endAt],
    queryFn: () => venuesAPI.getById(id!, startAt && endAt ? { startAt, endAt } : undefined),
    enabled: !!id && !!startAt && !!endAt,
  });
  const venue = venueWithAvailability ?? venueBase;
  const isLoading = !venueBase && !!id;
  const error = errorBase || errorAvail;

  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    if (venue) {
      setTables(venue.tables || []);
      setRooms(venue.rooms || []);
      setSeats(venue.seats || []);
      setEvents(venue.events || []);
    }
  }, [venue]);


  useEffect(() => {
    if (!id || !selectedDate || !selectedTime) return;
    const start = `${selectedDate}T${selectedTime}:00.000Z`;
    const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString();
    tablesAPI.getByVenue(id, start, end).then((nextTables) => {
      setTables(nextTables);
      setSelectedTable((prev) => {
        if (!prev) return null;
        const updated = nextTables.find((t) => t._id === prev._id);
        if (updated?.status === 'reserved') return null;
        return updated || prev;
      });
    });
  }, [id, selectedDate, selectedTime]);

  const handleTableSelect = (table: Table) => {
    if (table.status === 'reserved') return;
    setTableModalTable(table);
  };

  const confirmTableFromModal = () => {
    if (tableModalTable) {
      setSelectedTable(tableModalTable);
      setSelectedGuests((g) => Math.min(g, tableModalTable.capacity));
      setTableModalTable(null);
    }
  };

  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleReserve = async (form?: { guestFirstName: string; guestLastName: string; guestPhone: string; partySize: number }) => {
    if (!venue) return;
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour réserver');
      openAuthRequired();
      return;
    }
    const venueType = venue.type;
    let start: Date;
    let end: Date;
    let bookingType: 'TABLE' | 'ROOM' | 'SEAT' = 'TABLE';
    let tableId: string | undefined;
    let roomId: string | undefined;
    let seatId: string | undefined;
    let totalPrice = 0;
    let tableNumber = 0;
    let roomNumber = 0;
    let seatNumber = 0;

    if (venueType === 'HOTEL' && selectedRoom) {
      if (!selectedDate) return;
      start = new Date(`${selectedDate}T15:00:00.000Z`);
      end = new Date(`${selectedDate}T11:00:00.000Z`);
      end.setDate(end.getDate() + 1);
      bookingType = 'ROOM';
      roomId = selectedRoom._id;
      totalPrice = selectedRoom.pricePerNight;
      roomNumber = selectedRoom.roomNumber;
    } else if (venueType === 'CINEMA' && selectedSeat) {
      if (!selectedDate || !selectedTime) return;
      start = new Date(`${selectedDate}T${selectedTime}:00.000Z`);
      end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      bookingType = 'SEAT';
      seatId = selectedSeat._id;
      totalPrice = selectedSeat.price;
      seatNumber = selectedSeat.seatNumber;
    } else if ((venueType === 'CAFE' || venueType === 'RESTAURANT') && selectedTable) {
      if (!selectedDate || !selectedTime) return;
      start = new Date(`${selectedDate}T${selectedTime}:00.000Z`);
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      bookingType = 'TABLE';
      tableId = selectedTable._id;
      totalPrice = selectedTable.price;
      tableNumber = selectedTable.tableNumber;
    } else return;

    if (!form) {
      setConfirmModalOpen(true);
      return;
    }

    setReserveError(null);
    setReserveLoading(true);
    try {
      const result = await reservationsAPI.create({
        venueId: venue._id,
        bookingType,
        tableId,
        roomId,
        seatId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        totalPrice,
        guestFirstName: form.guestFirstName,
        guestLastName: form.guestLastName,
        guestPhone: form.guestPhone,
        partySize: form.partySize,
      });
      const res = (result as { reservation?: { _id: string; confirmationCode?: string } }).reservation;
      const reservationId = res?._id;
      const confirmationCode = res?.confirmationCode;
      navigate('/reservation', {
        state: {
          created: true,
          reservationId,
          confirmationCode,
          venueName: venue.name,
          tableNumber: venueType === 'CAFE' || venueType === 'RESTAURANT' ? tableNumber : undefined,
          roomNumber: venueType === 'HOTEL' ? roomNumber : undefined,
          seatNumber: venueType === 'CINEMA' ? seatNumber : undefined,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          venueAddress: venue.address,
          venueCity: venue.city,
          price: totalPrice,
          bookingType,
          partySize: form?.partySize,
        },
      });
    } catch (err) {
      setReserveError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
      throw err;
    } finally {
      setReserveLoading(false);
    }
  };

  if (isLoading || !id) {
    return (
      <div className="min-h-screen bg-landing-bg pb-20">
        <div className="h-80 md:h-96 bg-landing-card animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="rounded-xl border border-landing-border bg-landing-card p-6 mb-8 animate-pulse">
            <div className="h-8 bg-landing-bg/50 rounded w-1/3 mb-4" />
            <div className="h-4 bg-landing-bg/50 rounded w-1/2 mb-8" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-landing-bg/50 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-landing-border bg-landing-card p-6 animate-pulse">
            <div className="h-48 bg-landing-bg/50 rounded-lg mb-6" />
            <div className="space-y-3">
              <div className="h-5 bg-landing-bg/50 rounded w-full" />
              <div className="h-5 bg-landing-bg/50 rounded w-4/5" />
              <div className="h-5 bg-landing-bg/50 rounded w-3/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-landing-bg">
        <div className="text-center">
          <h2 className="mb-4 text-landing-text font-semibold">Lieu non trouvé</h2>
          <p className="text-landing-text-muted mb-4">{error?.message || "Le lieu demandé n'existe pas"}</p>
          <Link to="/explorer" className="text-landing-gold hover:text-landing-gold-light">Retour à l'explorateur</Link>
        </div>
      </div>
    );
  }

  const availableTables = tables.filter((t) => t.status !== 'reserved');
  const availableRooms = rooms.filter((r) => (r as any).status !== 'reserved');
  const availableSeats = seats.filter((s) => (s as any).status !== 'reserved');
  const backgroundImage = getHeroImage(venue);
  const tour360Url = getTour360EmbedUrl(venue);
  const hotspots = venue.hotspots || [];
  const tourHotspots = venue.tourHotspots || [];
  const venueType = venue.type;
  const hasTableBooking = venueType === 'CAFE' || venueType === 'RESTAURANT' || (venueType === 'EVENT_SPACE' && tables.length > 0);
  const hasRoomBooking = venueType === 'HOTEL';
  const hasSeatBooking = venueType === 'CINEMA';
  const selectedItem = selectedTable || selectedRoom || selectedSeat;
  const canReserve = (hasTableBooking && selectedTable) || (hasRoomBooking && selectedRoom) || (hasSeatBooking && selectedSeat);

  return (
    <div className="min-h-screen bg-landing-bg text-landing-text pb-20">
      <div className="relative h-80 md:h-96 bg-landing-card">
        <img src={backgroundImage} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-landing-bg via-landing-bg/60 to-transparent" />
        <div className="absolute top-4 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-landing-text-muted text-sm">
              <Link to="/" className="hover:text-landing-gold transition-colors">Accueil</Link>
              <span>/</span>
              <Link to="/explorer" className="hover:text-landing-gold transition-colors">Explorer</Link>
              <span>/</span>
              <span className="text-landing-text">{venue.name}</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-landing-text text-2xl md:text-3xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{venue.name}</h1>
                  <span className="px-3 py-1 rounded-full text-sm border border-landing-gold/50 text-landing-gold">{VENUE_TYPE_LABELS[venue.type] ?? venue.type}</span>
                </div>
                <div className="flex items-center gap-4 text-landing-text-muted text-sm">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{venue.address}</span>
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-landing-gold text-landing-gold" />{venue.rating}</span>
                </div>
              </div>
              {events.length > 0 && (
                <div className="px-4 py-2 rounded-lg bg-landing-gold text-[#161616] flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4" />Événement à venir
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="rounded-xl border border-landing-border bg-landing-card p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center"><Users className="w-6 h-6 text-emerald-400" /></div>
              <div>
                <div className="text-2xl font-semibold text-landing-text">
                  {hasTableBooking ? availableTables.length : hasRoomBooking ? availableRooms.length : availableSeats.length}
                </div>
                <div className="text-sm text-landing-text-muted">
                  {hasTableBooking ? 'Tables disponibles' : hasRoomBooking ? 'Chambres disponibles' : 'Places disponibles'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-landing-gold/20 flex items-center justify-center"><span className="text-lg font-semibold text-landing-gold">TND</span></div>
              <div>
                <div className="text-2xl font-semibold text-landing-gold">À partir de {venue.startingPrice ?? 0}</div>
                <div className="text-sm text-landing-text-muted">{hasRoomBooking ? 'Prix par nuit' : 'Prix'}</div>
              </div>
            </div>
            {events.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-landing-gold/20 flex items-center justify-center"><Music className="w-6 h-6 text-landing-gold" /></div>
                <div>
                  <div className="font-semibold text-landing-text">{events[0].title}</div>
                  <div className="text-sm text-landing-text-muted">{new Date(events[0].startAt).toLocaleDateString('fr-FR')} à {new Date(events[0].startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-12">
          <div className="mb-6">
            <span className="text-xs font-medium text-landing-gold uppercase tracking-wider">Étape 2</span>
            <h2 className="mb-2 text-landing-text font-semibold text-xl">Choisir une table</h2>
            <p className="text-landing-text-muted text-sm">Vue 360° ou liste ci-dessous — cliquez sur une table pour la sélectionner</p>
          </div>
          {tour360Url && (
            <div id="tour-360" className="relative mb-4 scroll-mt-24">
              <KlaptyEmbed url={tour360Url} />
              {tourHotspots.length > 0 ? (
                <TourHotspotOverlay
                  hotspots={tourHotspots as any}
                  tables={hasTableBooking ? tables : undefined}
                  rooms={hasRoomBooking ? rooms : undefined}
                  seats={hasSeatBooking ? seats : undefined}
                  onTableSelect={hasTableBooking ? handleTableSelect : undefined}
                  onRoomSelect={hasRoomBooking ? (room) => setSelectedRoom(room) : undefined}
                  onSeatSelect={hasSeatBooking ? (seat) => setSelectedSeat(seat) : undefined}
                  selectedTableId={selectedTable?._id}
                  selectedRoomId={selectedRoom?._id}
                  selectedSeatId={selectedSeat?._id}
                />
              ) : hasTableBooking && hotspots.length > 0 && (
                <TableHotspotOverlay
                  hotspots={hotspots as any}
                  tables={tables}
                  onTableSelect={handleTableSelect}
                  selectedTableId={selectedTable?._id}
                />
              )}
            </div>
          )}

          <Dialog open={!!tableModalTable} onOpenChange={(open) => !open && setTableModalTable(null)}>
            <DialogContent className="bg-landing-card border-landing-border text-landing-text max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-landing-text">Table {tableModalTable?.tableNumber}</DialogTitle>
              </DialogHeader>
              {tableModalTable && (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-landing-text-muted" />
                      <span>{tableModalTable.capacity} personnes</span>
                    </div>
                    <div className="flex items-center gap-2 text-landing-text-muted">
                      <span>{tableModalTable.locationLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tableModalTable.isVip && (
                        <span className="px-2 py-0.5 rounded text-xs bg-landing-gold text-[#161616] font-medium">VIP</span>
                      )}
                      <span className="text-landing-gold font-semibold">{tableModalTable.price} TND</span>
                    </div>
                    <p className="pt-2 text-landing-text-muted">
                      {tableModalTable.status === 'reserved' ? 'Réservée' : 'Disponible'}
                    </p>
                  </div>
                  <DialogFooter className="pt-4">
                    <button
                      type="button"
                      onClick={() => setTableModalTable(null)}
                      className="px-4 py-2 rounded-lg border border-landing-border text-landing-text hover:bg-landing-bg"
                    >
                      Fermer
                    </button>
                    {tableModalTable.status !== 'reserved' && (
                      <button
                        type="button"
                        onClick={confirmTableFromModal}
                        className="px-4 py-2 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
                      >
                        Réserver cette table
                      </button>
                    )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl border border-landing-border bg-landing-card p-6">
              <h3 className="mb-4 text-landing-text font-semibold">À propos de {venue.name}</h3>
              <p className="text-landing-text-muted leading-relaxed">{venue.description}</p>
            </div>
            <div className="rounded-xl border border-landing-border bg-landing-card p-6">
              <h3 className="mb-6 text-landing-text font-semibold">
                {hasTableBooking ? 'Sélectionnez votre table' : hasRoomBooking ? 'Sélectionnez une chambre' : 'Sélectionnez votre place'}
              </h3>
              {hasTableBooking && (
                tables.length === 0 ? (
                  <p className="text-landing-text-muted text-center py-8">Aucune table disponible</p>
                ) : (
                  <>
                    <p className="text-landing-text-muted text-sm mb-4">Cliquez sur une table pour la sélectionner</p>
                    <div className={`grid gap-4 ${tables.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                    {tables.map((table) => {
                      const isSelected = selectedTable?._id === table._id;
                      const isReserved = table.status === 'reserved';
                      return (
                        <button
                          key={table._id}
                          type="button"
                          onClick={() => {
                            if (table.status !== 'reserved') {
                              setSelectedTable(table);
                              setSelectedRoom(null);
                              setSelectedSeat(null);
                              setSelectedGuests((g) => Math.min(g, table.capacity));
                            }
                          }}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-landing-gold bg-landing-gold/10' : 'border-landing-border hover:border-landing-gold/50'} ${isReserved ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isReserved}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-landing-text mb-1">Table {table.tableNumber}</div>
                              <div className="flex items-center gap-2 text-sm text-landing-text-muted"><Users className="w-4 h-4" /><span>{table.capacity} personnes</span></div>
                            </div>
                            {table.isVip && <span className="px-2 py-1 rounded text-xs bg-landing-gold text-[#161616] font-medium">VIP</span>}
                          </div>
                          <div className="text-sm text-landing-text-muted mb-2">{table.locationLabel}</div>
                          <div className="text-landing-gold font-semibold">{table.price} TND</div>
                        </button>
                      );
                    })}
                    </div>
                  </>
                )
              )}
              {hasRoomBooking && (
                rooms.length === 0 ? (
                  <p className="text-landing-text-muted text-center py-8">Aucune chambre disponible</p>
                ) : (
                  <div className="space-y-4">
                    {rooms.map((room) => {
                      const r = room as Room & { status?: string };
                      const isSelected = selectedRoom?._id === r._id;
                      const isReserved = r.status === 'reserved';
                      return (
                        <div
                          key={r._id}
                          className={`w-full p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-landing-gold bg-landing-gold/10' : 'border-landing-border'} ${isReserved ? 'opacity-50' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-landing-text">Chambre {r.roomNumber}</div>
                              <div className="text-sm text-landing-text-muted">{r.roomType} · {r.capacity} pers.</div>
                            </div>
                            <div className="text-landing-gold font-semibold">{r.pricePerNight} TND / nuit</div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => document.getElementById('tour-360')?.scrollIntoView({ behavior: 'smooth' })}
                              className="px-3 py-1.5 rounded-lg border border-landing-border text-landing-text text-sm hover:bg-landing-bg"
                            >
                              Voir la chambre
                            </button>
                            <button
                              type="button"
                              onClick={() => !isReserved && (setSelectedRoom(r), setSelectedTable(null), setSelectedSeat(null))}
                              disabled={isReserved}
                              className="px-3 py-1.5 rounded-lg bg-landing-gold text-[#161616] text-sm font-medium hover:bg-landing-gold-light disabled:opacity-50"
                            >
                              Réserver cette chambre
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              {hasSeatBooking && (
                seats.length === 0 ? (
                  <p className="text-landing-text-muted text-center py-8">Aucune place disponible</p>
                ) : (
                  <div className="flex gap-4 flex-wrap">
                    {seats.map((seat) => {
                      const s = seat as Seat & { status?: string };
                      const isSelected = selectedSeat?._id === s._id;
                      const isReserved = s.status === 'reserved';
                      return (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => {
                            if (s.status !== 'reserved') {
                              setSelectedSeat(s);
                              setSelectedTable(null);
                              setSelectedRoom(null);
                            }
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-landing-gold bg-landing-gold/10' : 'border-landing-border hover:border-landing-gold/50'} ${isReserved ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isReserved}
                        >
                          <div className="font-semibold text-landing-text">Siège {s.seatNumber}</div>
                          <div className="text-sm text-landing-text-muted">{s.zone}</div>
                          <div className="text-landing-gold font-semibold mt-1">{s.price} TND</div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
            {events.length > 0 && (
              <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                <h3 className="mb-6 text-landing-text font-semibold">Événements à venir</h3>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event._id} className="flex gap-4 p-4 rounded-lg bg-landing-bg border border-landing-border">
                      <div className="w-24 h-24 rounded-lg bg-landing-gold/20 flex items-center justify-center"><Music className="w-10 h-10 text-landing-gold" /></div>
                      <div className="flex-1">
                        <h4 className="mb-1 text-landing-text font-medium">{event.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-landing-text-muted mb-2">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(event.startAt).toLocaleDateString('fr-FR')}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(event.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-landing-text-muted line-clamp-2">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-landing-border bg-landing-card p-6 sticky top-24 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              <h3 className="mb-4 text-landing-text font-semibold">Réservation</h3>
              {canReserve && selectedItem ? (
                <>
                  <div className="rounded-lg p-4 mb-6 bg-landing-gold/10 border border-landing-gold/30">
                    <div className="text-sm text-landing-text-muted mb-1">
                      {selectedTable && 'Table sélectionnée'}
                      {selectedRoom && 'Chambre sélectionnée'}
                      {selectedSeat && 'Place sélectionnée'}
                    </div>
                    <div className="font-semibold text-xl text-landing-text mb-2">
                      {selectedTable && `Table ${selectedTable.tableNumber}`}
                      {selectedRoom && `Chambre ${selectedRoom.roomNumber}`}
                      {selectedSeat && `Siège ${selectedSeat.seatNumber}`}
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedTable && (
                        <>
                          <div className="flex items-center gap-2 text-landing-text-muted"><Users className="w-4 h-4" /><span>{selectedTable.capacity} personnes</span></div>
                          <div className="text-landing-text-muted">{selectedTable.locationLabel}</div>
                        </>
                      )}
                      {selectedRoom && <div className="text-landing-text-muted">{selectedRoom.roomType} · {selectedRoom.pricePerNight} TND/nuit</div>}
                      {selectedSeat && <div className="text-landing-text-muted">{selectedSeat.zone} · {selectedSeat.price} TND</div>}
                      <div className="text-landing-gold font-semibold text-lg pt-2 border-t border-landing-border">
                        {selectedTable && `${selectedTable.price} TND`}
                        {selectedRoom && `${selectedRoom.pricePerNight} TND / nuit`}
                        {selectedSeat && `${selectedSeat.price} TND`}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 mb-6">
                    <p className="text-xs font-medium text-landing-gold uppercase tracking-wider">Étape 1 — Date {hasRoomBooking ? '(arrivée)' : 'et heure'}</p>
                    <div>
                      <label className="block mb-2 text-sm text-landing-text">Date</label>
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold" />
                    </div>
                    {!hasRoomBooking && (
                      <div>
                        <label className="block mb-2 text-sm text-landing-text">Heure</label>
                        <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold">
                          {['19:00','19:30','20:00','20:30','21:00','21:30','22:00'].map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </div>
                    )}
                    {selectedTable && (
                      <div>
                        <label className="block mb-2 text-sm text-landing-text">Nombre de personnes</label>
                        <select value={selectedGuests} onChange={(e) => setSelectedGuests(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold">
                          {Array.from({ length: selectedTable.capacity }, (_, i) => i + 1).map((num) => (<option key={num} value={num}>{num} {num === 1 ? 'personne' : 'personnes'}</option>))}
                        </select>
                      </div>
                    )}
                  </div>
                  {reserveError && <p className="text-red-400 text-sm mb-2">{reserveError}</p>}
                  <p className="text-xs font-medium text-landing-gold uppercase tracking-wider mb-2">Étape 3 — Confirmer</p>
                  <button type="button" onClick={() => handleReserve()} disabled={!selectedDate || (!hasRoomBooking && !selectedTime) || reserveLoading} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(201,162,39,0.35)]">
                    {reserveLoading ? 'Réservation...' : hasRoomBooking ? 'Réserver cette chambre' : hasSeatBooking ? 'Réserver cette place' : 'Réserver cette table'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-landing-text-muted">
                  <MousePointer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{hasRoomBooking ? 'Sélectionnez une chambre pour continuer' : hasSeatBooking ? 'Sélectionnez une place pour continuer' : 'Sélectionnez une table pour continuer'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReservationConfirmModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        capacity={
          selectedTable ? selectedTable.capacity
          : selectedRoom ? selectedRoom.capacity
          : selectedSeat ? 1
          : 1
        }
        bookingLabel={
          selectedTable ? `Table ${selectedTable.tableNumber}` : selectedRoom ? `Chambre ${selectedRoom.roomNumber}` : selectedSeat ? `Siège ${selectedSeat.seatNumber}` : ''
        }
        price={
          selectedTable ? selectedTable.price : selectedRoom ? selectedRoom.pricePerNight : selectedSeat ? selectedSeat.price : 0
        }
        dateLabel={
          hasRoomBooking
            ? `${new Date(selectedDate).toLocaleDateString('fr-FR')} (1 nuit)`
            : `${new Date(selectedDate).toLocaleDateString('fr-FR')} à ${selectedTime}`
        }
        onSubmit={async (form) => { await handleReserve(form); }}
      />
    </div>
  );
}
