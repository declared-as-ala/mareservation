import { Calendar, Users, TrendingUp, Settings, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reservationsAPI, venuesAPI, type Reservation, type Venue } from '../services/api';
import { useAuth } from '../context/AuthContext';

function getCustomerName(r: Reservation): string {
  const u = r.userId;
  if (typeof u === 'object' && u?.fullName) return u.fullName;
  return 'Client';
}

function getTableNumber(r: Reservation): number {
  const t = r.tableId;
  if (typeof t === 'object' && t?.tableNumber != null) return t.tableNumber;
  return 0;
}

function getVenueName(r: Reservation): string {
  const v = r.venueId;
  if (typeof v === 'object' && v?.name) return v.name;
  return '—';
}

export function VenueOwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'events' | 'reservations'>('overview');
  const { user, isAuthenticated } = useAuth();
  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations', 'owner'],
    queryFn: () => reservationsAPI.getForOwner(),
    enabled: isAuthenticated,
  });
  const { data: myVenues = [] } = useQuery({
    queryKey: ['venues', 'mine'],
    queryFn: () => venuesAPI.getMine(),
    enabled: isAuthenticated && user?.role === 'OWNER',
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeReservations = reservations.filter((r) => r.status !== 'CANCELLED');
  const todayReservations = activeReservations.filter((r) => {
    const start = new Date(r.startAt);
    return start >= todayStart && start < todayEnd;
  });
  const thisMonthReservations = activeReservations.filter((r) => new Date(r.startAt) >= thisMonthStart);
  const totalTables = myVenues.reduce((acc, v) => acc + (v.availableTables ?? 0), 0);
  const monthlyRevenue = activeReservations
    .filter((r) => new Date(r.startAt) >= thisMonthStart)
    .reduce((acc, r) => {
      const t = r.tableId;
      const price = typeof t === 'object' && t?.price != null ? t.price : 0;
      return acc + price;
    }, 0);

  const stats = {
    totalReservations: thisMonthReservations.length,
    todayReservations: todayReservations.length,
    tablesAvailable: totalTables,
    totalTables,
    monthlyRevenue,
  };

  const firstVenueId = myVenues[0]?._id;

  return (
    <div className="min-h-screen bg-landing-bg text-landing-text">
      <div className="border-b border-landing-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-landing-text text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Mon établissement
              </h1>
              <p className="text-landing-text-muted">Tableau de bord propriétaire</p>
            </div>
            {firstVenueId && (
            <Link
              to={`/lieu/${firstVenueId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-landing-gold text-landing-gold hover:bg-landing-gold/10 transition-all text-sm"
            >
              <Eye className="w-5 h-5" />
              Voir la page publique
            </Link>
          )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-landing-gold text-[#161616]'
                : 'bg-landing-card border border-landing-border text-landing-text hover:bg-landing-card/80'
            }`}
          >
            Mon établissement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'tables'
                ? 'bg-landing-gold text-[#161616]'
                : 'bg-landing-card border border-landing-border text-landing-text hover:bg-landing-card/80'
            }`}
          >
            Tables
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'events'
                ? 'bg-landing-gold text-[#161616]'
                : 'bg-landing-card border border-landing-border text-landing-text hover:bg-landing-card/80'
            }`}
          >
            Événements
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'reservations'
                ? 'bg-landing-gold text-[#161616]'
                : 'bg-landing-card border border-landing-border text-landing-text hover:bg-landing-card/80'
            }`}
          >
            Réservations
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 text-landing-gold" />
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-landing-text mb-1">{stats.todayReservations}</div>
                <div className="text-sm text-landing-text-muted">Réservations aujourd'hui</div>
              </div>
              <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-landing-gold" />
                </div>
                <div className="text-3xl font-bold text-landing-text mb-1">{stats.totalReservations}</div>
                <div className="text-sm text-landing-text-muted">Total ce mois</div>
              </div>
              <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <Settings className="w-8 h-8 text-landing-gold" />
                </div>
                <div className="text-3xl font-bold text-landing-text mb-1">{stats.tablesAvailable}/{stats.totalTables}</div>
                <div className="text-sm text-landing-text-muted">Tables disponibles</div>
              </div>
              <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl text-landing-gold font-semibold">TND</span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-landing-text mb-1">{stats.monthlyRevenue.toLocaleString()}</div>
                <div className="text-sm text-landing-text-muted">Revenu mensuel</div>
              </div>
            </div>
            <div className="rounded-xl border border-landing-border bg-landing-card p-6">
              <h3 className="mb-6 text-landing-text font-semibold">Réservations d'aujourd'hui</h3>
              {reservationsLoading ? (
                <p className="text-landing-text-muted">Chargement…</p>
              ) : todayReservations.length === 0 ? (
                <p className="text-landing-text-muted">Aucune réservation aujourd'hui.</p>
              ) : (
                <div className="space-y-4">
                  {todayReservations.map((reservation) => (
                    <div key={reservation._id} className="flex items-center justify-between p-4 rounded-lg bg-landing-bg border border-landing-border">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px] font-semibold text-landing-text">
                          {new Date(reservation.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="h-10 w-px bg-landing-border" />
                        <div>
                          <div className="font-medium text-landing-text mb-1">{getCustomerName(reservation)}</div>
                          <div className="text-sm text-landing-text-muted">
                            {getVenueName(reservation)} · Table {getTableNumber(reservation)}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${reservation.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : reservation.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-landing-gold/20 text-landing-gold'}`}>
                        {reservation.status === 'CONFIRMED' ? 'Confirmée' : reservation.status === 'CANCELLED' ? 'Annulée' : 'En attente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-landing-text font-semibold text-xl">Tables</h2>
              {firstVenueId && (
                <Link to={`/lieu/${firstVenueId}`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light">
                  <Eye className="w-5 h-5" />
                  Gérer les tables (page lieu)
                </Link>
              )}
            </div>
            <p className="text-landing-text-muted">Les tables sont gérées sur la page de chaque lieu. Total: {stats.totalTables} tables dans vos établissements.</p>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <h2 className="text-landing-text font-semibold text-xl">Événements</h2>
            <p className="text-landing-text-muted">Les événements sont affichés sur la page de chaque lieu. Création d'événements à venir.</p>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <h2 className="text-landing-text font-semibold text-xl">Réservations</h2>
            {reservationsLoading ? (
              <div className="rounded-xl border border-landing-border bg-landing-card p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-landing-bg/50 rounded animate-pulse" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="rounded-xl border border-landing-border bg-landing-card p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
                <p className="text-landing-text-muted">Aucune réservation pour vos établissements pour le moment</p>
              </div>
            ) : (
              <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-landing-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-landing-text">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-landing-text">Heure</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-landing-text">Lieu</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-landing-text">Client</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-landing-text">Table</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-landing-text">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-landing-border">
                      {reservations.map((reservation) => (
                        <tr key={reservation._id} className="hover:bg-landing-bg/50">
                          <td className="px-6 py-4 text-landing-text">{new Date(reservation.startAt).toLocaleDateString('fr-FR')}</td>
                          <td className="px-6 py-4 text-landing-text">{new Date(reservation.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-6 py-4 text-landing-text">{getVenueName(reservation)}</td>
                          <td className="px-6 py-4 text-landing-text">{getCustomerName(reservation)}</td>
                          <td className="px-6 py-4 text-landing-text">Table {getTableNumber(reservation)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${reservation.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : reservation.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-landing-gold/20 text-landing-gold'}`}>
                              {reservation.status === 'CONFIRMED' ? 'Confirmée' : reservation.status === 'CANCELLED' ? 'Annulée' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
