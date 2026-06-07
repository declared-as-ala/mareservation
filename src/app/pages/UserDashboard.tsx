import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Calendar, MapPin, QrCode, CheckCircle, XCircle, User, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reservationsAPI, type Reservation } from '../services/api';
import { ReservationTicket, type TicketData } from '../components/ReservationTicket';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';

export function UserDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [ticketModal, setTicketModal] = useState<{ open: boolean; ticket: TicketData | null }>({ open: false, ticket: null });

  const queryClient = useQueryClient();
  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations', 'me'],
    queryFn: () => reservationsAPI.getAll(),
    enabled: isAuthenticated,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsAPI.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations', 'me'] }),
  });

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    navigate('/connexion');
    return null;
  }

  const now = new Date();
  const upcoming = reservations.filter((r) => new Date(r.startAt) >= now && r.status !== 'CANCELLED');
  const past = reservations.filter((r) => new Date(r.startAt) < now && r.status !== 'CANCELLED');
  const cancelled = reservations.filter((r) => r.status === 'CANCELLED');

  const openTicket = (r: Reservation) => {
    const venue = typeof r.venueId === 'object' ? r.venueId : null;
    const table = typeof r.tableId === 'object' ? r.tableId : null;
    const room = typeof r.roomId === 'object' ? r.roomId : null;
    const seat = typeof r.seatId === 'object' ? r.seatId : null;
    setTicketModal({
      open: true,
      ticket: {
        _id: r._id,
        confirmationCode: r.confirmationCode,
        startAt: r.startAt,
        endAt: r.endAt,
        status: r.status,
        venueName: venue?.name,
        venueAddress: venue?.address,
        venueCity: venue?.city,
        bookingType: r.bookingType,
        tableNumber: table && 'tableNumber' in table ? table.tableNumber : undefined,
        roomNumber: room && 'roomNumber' in room ? room.roomNumber : undefined,
        seatNumber: seat && 'seatNumber' in seat ? seat.seatNumber : undefined,
        price: r.totalPrice ?? (table && 'price' in table ? table.price : room && 'pricePerNight' in room ? room.pricePerNight : seat && 'price' in seat ? seat.price : undefined),
        partySize: r.partySize,
      },
    });
  };

  const statusBadge = (status: string) => {
    if (status === 'CONFIRMED' || status === 'PENDING')
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 w-fit">
          <CheckCircle className="w-3.5 h-3.5" />
          Confirmée
        </span>
      );
    if (status === 'CANCELLED')
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 w-fit">
          <XCircle className="w-3.5 h-3.5" />
          Annulée
        </span>
      );
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-landing-text-muted/20 text-landing-text-muted">
        Terminée
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-landing-bg">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-landing-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-landing-text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  const venueName = (r: Reservation) => (typeof r.venueId === 'object' ? r.venueId.name : '');
  const venueCity = (r: Reservation) => (typeof r.venueId === 'object' ? r.venueId.city : '');
  const bookingLabel = (r: Reservation) => (r.bookingType === 'ROOM' ? 'Chambre' : r.bookingType === 'SEAT' ? 'Place' : 'Table');
  const bookingDetail = (r: Reservation) => {
    if (r.bookingType === 'ROOM' && typeof r.roomId === 'object' && r.roomId?.roomNumber != null) return `Chambre ${r.roomId.roomNumber}`;
    if (r.bookingType === 'SEAT' && typeof r.seatId === 'object' && r.seatId?.seatNumber != null) return `Siège ${r.seatId.seatNumber}`;
    if (typeof r.tableId === 'object' && r.tableId?.tableNumber != null) return `Table ${r.tableId.tableNumber}`;
    return '—';
  };
  const totalPrice = (r: Reservation) => r.totalPrice ?? (typeof r.tableId === 'object' ? r.tableId?.price : typeof r.roomId === 'object' ? (r.roomId as any)?.pricePerNight : typeof r.seatId === 'object' ? (r.seatId as any)?.price : 0);

  return (
    <div className="min-h-screen bg-landing-bg text-landing-text">
      <div className="border-b border-landing-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-landing-text text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Mon compte
          </h1>
          <p className="text-landing-text-muted">
            Gérez vos réservations et vos informations personnelles
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="upcoming" className="space-y-8">
          <TabsList className="bg-landing-card border border-landing-border p-1 rounded-lg">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-landing-gold data-[state=active]:text-[#161616] rounded-md">
              À venir
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-landing-gold data-[state=active]:text-[#161616] rounded-md">
              Passées
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-landing-gold data-[state=active]:text-[#161616] rounded-md">
              Annulées
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-landing-gold data-[state=active]:text-[#161616] rounded-md">
              Mon profil
            </TabsTrigger>
          </TabsList>

        <TabsContent value="upcoming" className="mt-0">
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-landing-text font-semibold text-xl">À venir</h2>
            <Link to="/explorer" className="text-landing-gold hover:text-landing-gold-light text-sm font-medium">
              Nouvelle réservation
            </Link>
          </div>

          {reservationsLoading ? (
            <div className="rounded-xl border border-landing-border bg-landing-card p-12 text-center">
              <div className="w-10 h-10 border-2 border-landing-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-landing-text-muted">Chargement des réservations...</p>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-xl border border-landing-border bg-landing-card p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-landing-text-muted opacity-50" />
              <p className="text-landing-text-muted mb-4">Vous n'avez aucune réservation à venir</p>
              <Link
                to="/explorer"
                className="inline-block px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
              >
                Explorer les lieux
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {upcoming.map((r) => (
                <div
                  key={r._id}
                  className="rounded-xl border border-landing-border bg-landing-card overflow-hidden"
                >
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-landing-text font-semibold">{venueName(r)}</h3>
                      {statusBadge(r.status)}
                    </div>
                    <div className="flex items-center gap-1 text-landing-text-muted mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{venueCity(r)}</span>
                    </div>
                    <div className="space-y-2 mb-4 pb-4 border-b border-landing-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-landing-text-muted">Date</span>
                        <span className="font-medium text-landing-text">
                          {new Date(r.startAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-landing-text-muted">Heure</span>
                        <span className="font-medium text-landing-text">
                          {new Date(r.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-landing-text-muted">{bookingLabel(r)}</span>
                        <span className="font-medium text-landing-text">{bookingDetail(r)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-landing-text-muted">Prix</span>
                        <span className="font-medium text-landing-gold">{totalPrice(r)} TND</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-landing-text-muted font-mono truncate" title={r._id}>{r.confirmationCode ?? r._id}</span>
                      {r.status !== 'CANCELLED' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openTicket(r)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-landing-gold text-landing-gold hover:bg-landing-gold/10 text-sm font-medium"
                          >
                            <QrCode className="w-4 h-4" />
                            QR
                          </button>
                          <button
                            type="button"
                            onClick={() => openTicket(r)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-landing-border text-landing-text hover:bg-landing-bg/50 text-sm font-medium"
                            title="Voir le ticket et imprimer"
                          >
                            <Printer className="w-4 h-4" />
                            Ticket
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelMutation.mutate(r._id)}
                            disabled={cancelMutation.isPending}
                            className="px-3 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm font-medium disabled:opacity-50"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </TabsContent>

        <TabsContent value="past" className="mt-0">
        <section>
          <h2 className="mb-6 text-landing-text font-semibold text-xl">Passées</h2>
          {past.length === 0 ? (
            <div className="rounded-xl border border-landing-border bg-landing-card p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
              <p className="text-landing-text-muted">Aucune réservation passée pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {past.map((r) => (
                <div key={r._id} className="rounded-xl border border-landing-border bg-landing-card p-6 opacity-90">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-landing-text font-medium">{venueName(r)}</h3>
                      <div className="flex items-center gap-1 text-landing-text-muted mt-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{venueCity(r)}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-landing-text-muted">Date</span>
                          <p className="font-medium text-landing-text">{new Date(r.startAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <span className="text-landing-text-muted">Heure</span>
                          <p className="font-medium text-landing-text">{new Date(r.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div>
                          <span className="text-landing-text-muted">{bookingLabel(r)}</span>
                          <p className="font-medium text-landing-text">{bookingDetail(r)}</p>
                        </div>
                        <div>
                          <span className="text-landing-text-muted">Prix</span>
                          <p className="font-medium text-landing-text">{totalPrice(r)} TND</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(r.status)}
                      <button
                        type="button"
                        onClick={() => openTicket(r)}
                        className="p-2 rounded-lg border border-landing-border text-landing-gold hover:bg-landing-gold/10"
                        title="Afficher QR"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-0">
          {cancelled.length === 0 ? (
            <div className="rounded-xl border border-landing-border bg-landing-card p-12 text-center">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
              <p className="text-landing-text-muted">Aucune réservation annulée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cancelled.map((r) => (
                <div key={r._id} className="rounded-xl border border-landing-border bg-landing-card p-6 opacity-90">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-landing-text font-medium">{venueName(r)}</h3>
                      <p className="text-sm text-landing-text-muted mt-1">{venueCity(r)} · {new Date(r.startAt).toLocaleDateString('fr-FR')} · {bookingDetail(r)}</p>
                      <p className="text-xs font-mono text-landing-gold mt-2">{r.confirmationCode ?? r._id}</p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-0">
          <div className="rounded-xl border border-landing-border bg-landing-card p-6 max-w-md">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-landing-gold/20 flex items-center justify-center">
                <User className="w-8 h-8 text-landing-gold" />
              </div>
              <div>
                <h3 className="text-landing-text font-semibold text-lg">{user?.fullName ?? 'Mon compte'}</h3>
                <p className="text-landing-text-muted text-sm">{user?.email ?? ''}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-landing-text-muted">Pour modifier votre mot de passe ou vos informations, contactez le support.</p>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      <ReservationTicket
        open={ticketModal.open}
        onOpenChange={(open) => setTicketModal((prev) => ({ ...prev, open }))}
        ticket={ticketModal.ticket}
      />
    </div>
  );
}
