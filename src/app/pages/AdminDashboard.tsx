import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Building2,
  Calendar,
  Music,
  Search,
  TrendingUp,
  XCircle,
  DollarSign,
  BarChart3,
  PieChart,
  LayoutDashboard,
  UserCog,
  MapPin,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import { toast } from 'sonner';

const RANGE_OPTIONS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
] as const;
const CHART_COLORS = ['#C9A227', '#2a2a2a', '#4a4a4a', '#6a6a6a', '#8a8a8a'];
const PIE_COLORS = ['#C9A227', '#4a7c59', '#5a9fd4'];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-landing-border bg-landing-card p-6 animate-pulse">
      <div className="h-8 w-8 bg-landing-bg/50 rounded mb-4" />
      <div className="h-8 bg-landing-bg/50 rounded w-2/3 mb-2" />
      <div className="h-4 bg-landing-bg/50 rounded w-1/3" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-landing-border bg-landing-card p-6 h-80 animate-pulse">
      <div className="h-6 bg-landing-bg/50 rounded w-1/3 mb-6" />
      <div className="h-full bg-landing-bg/30 rounded" />
    </div>
  );
}

function exportReservationsCSV(reservations: any[]) {
  const headers = ['Date', 'Client', 'Lieu', 'Type', 'Prix (TND)', 'Statut'];
  const rows = reservations.map((r) => [
    new Date(r.startAt).toLocaleString('fr-FR'),
    (r.userId as any)?.email ?? '',
    typeof r.venueId === 'object' ? (r.venueId as any)?.name : '',
    r.bookingType,
    r.totalPrice ?? '',
    r.status,
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'venues' | 'reservations' | 'events' | 'hotspots'>('overview');
  const [hotspotsVenueId, setHotspotsVenueId] = useState('');
  const [hotspotsTourId, setHotspotsTourId] = useState('');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

  const [userPage, setUserPage] = useState(1);
  const [userQ, setUserQ] = useState('');
  const [venuePage, setVenuePage] = useState(1);
  const [venueType, setVenueType] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [resPage, setResPage] = useState(1);
  const [resStatus, setResStatus] = useState('');
  const [resType, setResType] = useState('');

  const enabled = isAuthenticated && user?.role === 'ADMIN';

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin', 'overview', range],
    queryFn: () => adminAPI.getOverview(range),
    enabled: enabled && activeTab === 'overview',
  });

  const { data: resDaily, isLoading: resDailyLoading } = useQuery({
    queryKey: ['admin', 'charts', 'reservations-daily', days],
    queryFn: () => adminAPI.getChartsReservationsDaily(days),
    enabled: enabled && activeTab === 'overview',
  });
  const { data: revenueDaily, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin', 'charts', 'revenue-daily', days],
    queryFn: () => adminAPI.getChartsRevenueDaily(days),
    enabled: enabled && activeTab === 'overview',
  });
  const { data: byType, isLoading: byTypeLoading } = useQuery({
    queryKey: ['admin', 'charts', 'by-type', days],
    queryFn: () => adminAPI.getChartsReservationsByType(days),
    enabled: enabled && activeTab === 'overview',
  });
  const { data: byCity, isLoading: byCityLoading } = useQuery({
    queryKey: ['admin', 'charts', 'by-city', days],
    queryFn: () => adminAPI.getChartsReservationsByCity(days),
    enabled: enabled && activeTab === 'overview',
  });
  const { data: topVenues, isLoading: topVenuesLoading } = useQuery({
    queryKey: ['admin', 'charts', 'top-venues', days],
    queryFn: () => adminAPI.getChartsTopVenues(days, 5),
    enabled: enabled && activeTab === 'overview',
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', userPage, userQ],
    queryFn: () => adminAPI.getUsers({ page: userPage, q: userQ || undefined }),
    enabled: enabled && activeTab === 'users',
  });
  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ['admin', 'venues', venuePage, venueType, venueCity],
    queryFn: () => adminAPI.getVenues({ page: venuePage, type: venueType || undefined, city: venueCity || undefined }),
    enabled: enabled && activeTab === 'venues',
  });
  const { data: resData, isLoading: resLoading } = useQuery({
    queryKey: ['admin', 'reservations', resPage, resStatus, resType],
    queryFn: () => adminAPI.getReservations({ page: resPage, status: resStatus || undefined, type: resType || undefined }),
    enabled: enabled && activeTab === 'reservations',
  });
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => adminAPI.getEvents(),
    enabled: enabled && activeTab === 'events',
  });
  const { data: venuesForHotspots = [] } = useQuery({
    queryKey: ['admin', 'venues', 'all'],
    queryFn: async () => {
      const r = await adminAPI.getVenues({ page: 1 });
      return r.venues ?? [];
    },
    enabled: enabled && activeTab === 'hotspots',
  });
  const { data: toursForHotspots = [], refetch: refetchTours } = useQuery({
    queryKey: ['admin', 'virtual-tours', hotspotsVenueId],
    queryFn: () => adminAPI.getVirtualTours(hotspotsVenueId),
    enabled: enabled && activeTab === 'hotspots' && !!hotspotsVenueId,
  });
  const { data: hotspotsList = [], refetch: refetchHotspots } = useQuery({
    queryKey: ['admin', 'tour-hotspots', hotspotsTourId],
    queryFn: () => adminAPI.getTourHotspots(hotspotsTourId),
    enabled: enabled && activeTab === 'hotspots' && !!hotspotsTourId,
  });

  if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
    navigate('/connexion');
    return null;
  }

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Annuler cette réservation ?')) return;
    try {
      await adminAPI.cancelReservation(id);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Réservation annulée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const users = usersData?.users ?? [];
  const venues = venuesData?.venues ?? [];
  const reservations = resData?.reservations ?? [];

  const navItems = [
    { id: 'overview' as const, label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'users' as const, label: 'Utilisateurs', icon: UserCog },
    { id: 'venues' as const, label: 'Lieux', icon: MapPin },
    { id: 'reservations' as const, label: 'Réservations', icon: Calendar },
    { id: 'events' as const, label: 'Événements', icon: Music },
    { id: 'hotspots' as const, label: 'Visites 360 / Hotspots', icon: Image },
  ];

  return (
    <div className="min-h-screen bg-landing-bg text-landing-text flex">
      <aside className="w-64 shrink-0 border-r border-landing-border bg-landing-card">
        <div className="p-6 border-b border-landing-border">
          <Link to="/" className="font-semibold text-landing-text" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Ma Reservation
          </Link>
          <p className="text-xs text-landing-text-muted mt-1">Administration</p>
        </div>
        <nav className="p-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === id ? 'bg-landing-gold/20 text-landing-gold border border-landing-gold/40' : 'hover:bg-landing-bg/50 text-landing-text'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="border-b border-landing-border py-6 px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Tableau de bord Admin
            </h1>
            {activeTab === 'overview' && (
              <div className="flex gap-2">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRange(r.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      range === r.value ? 'bg-landing-gold text-[#161616]' : 'bg-landing-card border border-landing-border hover:border-landing-gold/50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-8">
          {activeTab === 'overview' && (
            <>
              {/* KPIs */}
              {overviewLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : overview ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <Users className="w-8 h-8 text-landing-gold mb-2" />
                    <div className="text-2xl font-bold">{overview.totalUsers}</div>
                    <div className="text-sm text-landing-text-muted">Total utilisateurs</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <TrendingUp className="w-8 h-8 text-emerald-500 mb-2" />
                    <div className="text-2xl font-bold">{overview.newUsers7d}</div>
                    <div className="text-sm text-landing-text-muted">Nouveaux (7j)</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <Building2 className="w-8 h-8 text-landing-gold mb-2" />
                    <div className="text-2xl font-bold">{overview.totalVenues}</div>
                    <div className="text-sm text-landing-text-muted">Lieux</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <Calendar className="w-8 h-8 text-landing-gold mb-2" />
                    <div className="text-2xl font-bold">{overview.reservationsToday}</div>
                    <div className="text-sm text-landing-text-muted">Résa. aujourd'hui</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <Calendar className="w-8 h-8 text-landing-gold mb-2" />
                    <div className="text-2xl font-bold">{overview.reservations7d}</div>
                    <div className="text-sm text-landing-text-muted">Résa. 7 jours</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <XCircle className="w-8 h-8 text-red-400 mb-2" />
                    <div className="text-2xl font-bold">{overview.cancellationRate30d}%</div>
                    <div className="text-sm text-landing-text-muted">Taux annulation (30j)</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <DollarSign className="w-8 h-8 text-emerald-500 mb-2" />
                    <div className="text-2xl font-bold">{overview.revenue30d?.toLocaleString() ?? 0}</div>
                    <div className="text-sm text-landing-text-muted">Revenu estimé (30j) TND</div>
                  </div>
                  <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                    <MapPin className="w-8 h-8 text-landing-gold mb-2" />
                    <div className="text-2xl font-bold">{overview.activeVenues30d}</div>
                    <div className="text-sm text-landing-text-muted">Lieux actifs (30j)</div>
                  </div>
                </div>
              ) : null}

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Réservations par jour</h3>
                  {resDailyLoading ? <ChartSkeleton /> : resDaily?.length ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={resDaily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#888" fontSize={12} />
                          <YAxis stroke="#888" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Line type="monotone" dataKey="count" stroke="#C9A227" strokeWidth={2} name="Réservations" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-landing-text-muted">
                      Aucune donnée sur la période
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenu estimé par jour</h3>
                  {revenueLoading ? <ChartSkeleton /> : revenueDaily?.length ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueDaily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#888" fontSize={12} />
                          <YAxis stroke="#888" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Line type="monotone" dataKey="revenue" stroke="#4a7c59" strokeWidth={2} name="Revenu (TND)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-landing-text-muted">
                      Aucune donnée sur la période
                    </div>
                  )}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Par type (Table / Chambre / Siège)</h3>
                  {byTypeLoading ? <ChartSkeleton /> : byType?.length ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byType} layout="vertical" margin={{ left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis type="number" stroke="#888" fontSize={12} />
                          <YAxis type="category" dataKey="label" stroke="#888" fontSize={12} width={60} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Bar dataKey="count" fill="#C9A227" name="Réservations" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-landing-text-muted">Aucune donnée</div>
                  )}
                </div>
                <div className="rounded-xl border border-landing-border bg-landing-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Répartition par ville</h3>
                  {byCityLoading ? <ChartSkeleton /> : byCity?.length ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={byCity}
                            dataKey="count"
                            nameKey="city"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            label={(entry) => entry.city}
                          >
                            {byCity.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-landing-text-muted">Aucune donnée</div>
                  )}
                </div>
              </div>
              {topVenues?.length ? (
                <div className="mt-8 rounded-xl border border-landing-border bg-landing-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Top 5 lieux (réservations)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topVenues} margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="venueName" stroke="#888" fontSize={11} angle={-25} textAnchor="end" height={70} />
                        <YAxis stroke="#888" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Bar dataKey="count" fill="#C9A227" name="Réservations" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {activeTab === 'users' && (
            <section>
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-landing-text-muted" />
                  <input
                    type="text"
                    value={userQ}
                    onChange={(e) => { setUserQ(e.target.value); setUserPage(1); }}
                    placeholder="Rechercher par email…"
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden">
                {usersLoading ? (
                  <div className="p-8 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-landing-bg/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
                    <p className="text-landing-text-muted">Aucun utilisateur trouvé</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="bg-landing-bg">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Email</th>
                          <th className="px-4 py-3 text-left font-medium">Nom</th>
                          <th className="px-4 py-3 text-left font-medium">Rôle</th>
                          <th className="px-4 py-3 text-left font-medium">Résa.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-landing-border">
                        {users.map((u: any) => (
                          <tr key={u._id}>
                            <td className="px-4 py-3">{u.email}</td>
                            <td className="px-4 py-3">{u.fullName}</td>
                            <td className="px-4 py-3">{u.role}</td>
                            <td className="px-4 py-3">{u.reservationsCount ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {usersData && usersData.pages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-landing-border">
                        <span className="text-sm text-landing-text-muted">
                          Page {usersData.page} / {usersData.pages} ({usersData.total} total)
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                            disabled={usersData.page <= 1}
                            className="p-2 rounded border border-landing-border disabled:opacity-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserPage((p) => p + 1)}
                            disabled={usersData.page >= usersData.pages}
                            className="p-2 rounded border border-landing-border disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === 'venues' && (
            <section>
              <div className="flex gap-2 mb-6 flex-wrap">
                <select
                  value={venueType}
                  onChange={(e) => { setVenueType(e.target.value); setVenuePage(1); }}
                  className="px-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text"
                >
                  <option value="">Tous les types</option>
                  <option value="CAFE">Café</option>
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="HOTEL">Hôtel</option>
                  <option value="CINEMA">Cinéma</option>
                </select>
                <input
                  type="text"
                  value={venueCity}
                  onChange={(e) => { setVenueCity(e.target.value); setVenuePage(1); }}
                  placeholder="Ville"
                  className="px-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text max-w-[200px]"
                />
              </div>
              <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden">
                {venuesLoading ? (
                  <div className="p-8 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-landing-bg/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : venues.length === 0 ? (
                  <div className="p-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
                    <p className="text-landing-text-muted">Aucun lieu trouvé</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="bg-landing-bg">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Nom</th>
                          <th className="px-4 py-3 text-left font-medium">Type</th>
                          <th className="px-4 py-3 text-left font-medium">Ville</th>
                          <th className="px-4 py-3 text-left font-medium">Note</th>
                          <th className="px-4 py-3 text-left font-medium">Résa.</th>
                          <th className="px-4 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-landing-border">
                        {venues.map((v: any) => (
                          <tr key={v._id}>
                            <td className="px-4 py-3">{v.name}</td>
                            <td className="px-4 py-3">{v.type}</td>
                            <td className="px-4 py-3">{v.city}</td>
                            <td className="px-4 py-3">{v.rating ?? '—'}</td>
                            <td className="px-4 py-3">{v.reservationsCount ?? 0}</td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => navigate(`/lieu/${v._id}`)} className="text-landing-gold hover:underline">
                                Voir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {venuesData && venuesData.pages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-landing-border">
                        <span className="text-sm text-landing-text-muted">
                          Page {venuesData.page} / {venuesData.pages}
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setVenuePage((p) => Math.max(1, p - 1))} disabled={venuesData.page <= 1} className="p-2 rounded border border-landing-border disabled:opacity-50">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setVenuePage((p) => p + 1)} disabled={venuesData.page >= venuesData.pages} className="p-2 rounded border border-landing-border disabled:opacity-50">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === 'reservations' && (
            <section>
              <div className="flex gap-2 mb-6 flex-wrap">
                <select
                  value={resStatus}
                  onChange={(e) => { setResStatus(e.target.value); setResPage(1); }}
                  className="px-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text"
                >
                  <option value="">Tous les statuts</option>
                  <option value="CONFIRMED">Confirmées</option>
                  <option value="PENDING">En attente</option>
                  <option value="CANCELLED">Annulées</option>
                </select>
                <select
                  value={resType}
                  onChange={(e) => { setResType(e.target.value); setResPage(1); }}
                  className="px-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text"
                >
                  <option value="">Tous les types</option>
                  <option value="TABLE">Table</option>
                  <option value="ROOM">Chambre</option>
                  <option value="SEAT">Siège</option>
                </select>
                <button
                  type="button"
                  onClick={() => exportReservationsCSV(reservations)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
                >
                  <Download className="w-4 h-4" />
                  Exporter CSV
                </button>
              </div>
              <div className="rounded-xl border border-landing-border bg-landing-card overflow-x-auto">
                {resLoading ? (
                  <div className="p-8 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-landing-bg/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
                    <p className="text-landing-text-muted">Aucune réservation trouvée</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="bg-landing-bg">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Client</th>
                          <th className="px-4 py-3 text-left font-medium">Lieu</th>
                          <th className="px-4 py-3 text-left font-medium">Type</th>
                          <th className="px-4 py-3 text-left font-medium">Prix</th>
                          <th className="px-4 py-3 text-left font-medium">Statut</th>
                          <th className="px-4 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-landing-border">
                        {reservations.map((r: any) => (
                          <tr key={r._id}>
                            <td className="px-4 py-3">{new Date(r.startAt).toLocaleString('fr-FR')}</td>
                            <td className="px-4 py-3">{(r.userId as any)?.email ?? '—'}</td>
                            <td className="px-4 py-3">{typeof r.venueId === 'object' ? (r.venueId as any)?.name : '—'}</td>
                            <td className="px-4 py-3">{r.bookingType}</td>
                            <td className="px-4 py-3">{r.totalPrice ?? '—'} TND</td>
                            <td className="px-4 py-3">{r.status}</td>
                            <td className="px-4 py-3">
                              {r.status !== 'CANCELLED' && (
                                <button type="button" onClick={() => handleCancelReservation(r._id)} className="text-red-400 hover:underline">
                                  Annuler
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resData && resData.pages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-landing-border">
                        <span className="text-sm text-landing-text-muted">
                          Page {resData.page} / {resData.pages}
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setResPage((p) => Math.max(1, p - 1))} disabled={resData.page <= 1} className="p-2 rounded border border-landing-border disabled:opacity-50">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setResPage((p) => p + 1)} disabled={resData.page >= resData.pages} className="p-2 rounded border border-landing-border disabled:opacity-50">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === 'events' && (
            <section>
              <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden">
                {eventsLoading ? (
                  <div className="p-8 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-landing-bg/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-12 text-center">
                    <Music className="w-12 h-12 mx-auto mb-4 text-landing-text-muted opacity-50" />
                    <p className="text-landing-text-muted">Aucun événement</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-landing-bg">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Titre</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Lieu</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-landing-border">
                      {events.map((e: any) => (
                        <tr key={e._id}>
                          <td className="px-4 py-3">{e.title}</td>
                          <td className="px-4 py-3">{e.type}</td>
                          <td className="px-4 py-3">{typeof e.venueId === 'object' ? (e.venueId as any)?.name : '—'}</td>
                          <td className="px-4 py-3">{new Date(e.startAt).toLocaleString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {activeTab === 'hotspots' && (
            <section className="space-y-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm text-landing-text-muted mb-1">Lieu</label>
                  <select
                    value={hotspotsVenueId}
                    onChange={(e) => { setHotspotsVenueId(e.target.value); setHotspotsTourId(''); }}
                    className="px-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text min-w-[200px]"
                  >
                    <option value="">Sélectionner un lieu</option>
                    {venuesForHotspots.map((v: any) => (
                      <option key={v._id} value={v._id}>{v.name} — {v.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-landing-text-muted mb-1">Visite virtuelle</label>
                  <select
                    value={hotspotsTourId}
                    onChange={(e) => setHotspotsTourId(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-landing-card border border-landing-border text-landing-text min-w-[220px]"
                  >
                    <option value="">Sélectionner une visite</option>
                    {toursForHotspots.map((t: any) => (
                      <option key={t._id} value={t._id}>{t.provider} — {t.embedUrl ? 'Klapty' : t.videoUrl ? 'Vidéo' : '—'}</option>
                    ))}
                  </select>
                </div>
              </div>
              {hotspotsTourId && (
                <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-landing-border font-medium">Points d&apos;intérêt (x%, y%)</div>
                  {hotspotsList.length === 0 ? (
                    <div className="p-8 text-center text-landing-text-muted">Aucun hotspot pour cette visite. Créez-en via l’API ou un outil dédié.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-landing-bg">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Label</th>
                          <th className="px-4 py-3 text-left font-medium">Type cible</th>
                          <th className="px-4 py-3 text-left font-medium">x%</th>
                          <th className="px-4 py-3 text-left font-medium">y%</th>
                          <th className="px-4 py-3 text-left font-medium">Actif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-landing-border">
                        {hotspotsList.map((h: any) => (
                          <tr key={h._id}>
                            <td className="px-4 py-3">{h.label}</td>
                            <td className="px-4 py-3">{h.targetType}</td>
                            <td className="px-4 py-3">{h.xPercent}</td>
                            <td className="px-4 py-3">{h.yPercent}</td>
                            <td className="px-4 py-3">{h.isActive ? 'Oui' : 'Non'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
