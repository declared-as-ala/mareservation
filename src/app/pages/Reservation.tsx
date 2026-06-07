import { useState, useEffect } from 'react';
import { Check, User, Mail, Phone, MessageSquare, Calendar, Clock, Users, MapPin, Loader2, QrCode } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { reservationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReservationTicket } from '../components/ReservationTicket';

interface PendingReservation {
  tableId: string;
  venueId: string;
  venueName: string;
  venueAddress: string;
  tableNumber: number;
  tableCapacity: number;
  tableLocation: string;
  tablePrice: number;
  date: string;
  time: string;
  guests: number;
}

export function Reservation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const createdState = location.state as {
    created?: boolean;
    reservationId?: string;
    venueName?: string;
    venueAddress?: string;
    venueCity?: string;
    tableNumber?: number;
    roomNumber?: number;
    seatNumber?: number;
    price?: number;
    startAt?: string;
    endAt?: string;
    bookingType?: 'TABLE' | 'ROOM' | 'SEAT';
    partySize?: number;
  } | null;
  const [step, setStep] = useState(createdState?.created ? 3 : 1);
  const [pendingReservation, setPendingReservation] = useState<PendingReservation | null>(() => {
    if (createdState?.created && createdState.venueName != null && createdState.startAt && createdState.endAt) {
      const start = new Date(createdState.startAt);
      return {
        tableId: '',
        venueId: '',
        venueName: createdState.venueName,
        venueAddress: createdState.venueAddress ?? '',
        tableNumber: createdState.tableNumber ?? 0,
        tableCapacity: createdState.partySize ?? 2,
        tableLocation: '',
        tablePrice: createdState.price ?? 0,
        date: createdState.startAt.slice(0, 10),
        time: start.toTimeString().slice(0, 5),
        guests: createdState.partySize ?? 2,
      };
    }
    return null;
  });
  const [ticketOpen, setTicketOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationResult, setReservationResult] = useState<any>(createdState?.created ? { message: 'Réservation créée', reservation: {} } : null);

  useEffect(() => {
    if (createdState?.created) return;
    const stored = sessionStorage.getItem('pendingReservation');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPendingReservation(data);
      } catch (err) {
        console.error('Error parsing pending reservation:', err);
        navigate('/explorer');
      }
    } else {
      navigate('/explorer');
    }
  }, [createdState?.created, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (!pendingReservation) {
        setError('Informations de réservation manquantes');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const startAt = new Date(`${pendingReservation.date}T${pendingReservation.time}`);
        const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
        const result = await reservationsAPI.create({
          venueId: pendingReservation.venueId,
          tableId: pendingReservation.tableId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
        setReservationResult(result);
        sessionStorage.removeItem('pendingReservation');
        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!pendingReservation && !createdState?.created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-landing-bg">
        <div className="text-center text-landing-text-muted">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-landing-bg text-landing-text py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step >= stepNum
                      ? 'bg-landing-gold text-[#161616]'
                      : 'bg-landing-card border border-landing-border text-landing-text-muted'
                  }`}
                >
                  {step > stepNum ? <Check className="w-5 h-5" /> : stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 transition-all ${
                      step > stepNum ? 'bg-landing-gold' : 'bg-landing-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-landing-text-muted text-sm">
              {step === 1 && 'Détails réservation'}
              {step === 2 && 'Informations client'}
              {step === 3 && 'Confirmation'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-landing-border bg-landing-card overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          {/* Step 1: Reservation Details */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="mb-6 text-landing-text font-semibold text-xl">Détails réservation</h2>
              <div className="space-y-6">
                <div className="rounded-lg p-6 bg-landing-bg border border-landing-border">
                  <h3 className="mb-4 text-landing-text font-medium">{pendingReservation.venueName}</h3>
                  <div className="flex items-start gap-2 text-landing-text-muted">
                    <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{pendingReservation.venueAddress}</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-lg p-4 bg-landing-gold/10 border border-landing-gold/30">
                    <div className="flex items-center gap-2 text-landing-text-muted mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm">Date</span>
                    </div>
                    <p className="font-medium text-landing-text">
                      {new Date(pendingReservation.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg p-4 bg-landing-gold/10 border border-landing-gold/30">
                    <div className="flex items-center gap-2 text-landing-text-muted mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm">Heure</span>
                    </div>
                    <p className="font-medium text-landing-text">{pendingReservation.time}</p>
                  </div>
                  <div className="rounded-lg p-4 bg-landing-gold/10 border border-landing-gold/30">
                    <div className="flex items-center gap-2 text-landing-text-muted mb-2">
                      <Users className="w-5 h-5" />
                      <span className="text-sm">Personnes</span>
                    </div>
                    <p className="font-medium text-landing-text">{pendingReservation.guests} personnes</p>
                  </div>
                  <div className="rounded-lg p-4 bg-landing-gold/10 border border-landing-gold/30">
                    <div className="text-sm text-landing-text-muted mb-2">Table</div>
                    <p className="font-medium text-landing-text">Table {pendingReservation.tableNumber}</p>
                    <p className="text-sm text-landing-text-muted">{pendingReservation.tableLocation}</p>
                  </div>
                </div>
                <div className="rounded-lg p-6 bg-landing-gold/10 border-2 border-landing-gold/40">
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-landing-text">Prix total</span>
                    <span className="text-3xl font-bold text-landing-gold">{pendingReservation.tablePrice} TND</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full mt-8 px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light shadow-[0_4px_14px_rgba(201,162,39,0.35)]"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 2: User Information */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="mb-6 text-landing-text font-semibold text-xl">Informations client</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 text-sm text-landing-text">
                      <span className="flex items-center gap-2"><User className="w-4 h-4" />Prénom *</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                      placeholder="Votre prénom"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm text-landing-text">
                      <span className="flex items-center gap-2"><User className="w-4 h-4" />Nom *</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">
                    <span className="flex items-center gap-2"><Mail className="w-4 h-4" />Email *</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                    placeholder="votre.email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">
                    <span className="flex items-center gap-2"><Phone className="w-4 h-4" />Téléphone *</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
                    placeholder="+216 XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm text-landing-text">
                    <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Notes (optionnel)</span>
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold resize-none"
                    placeholder="Allergies, demandes spéciales..."
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 rounded-lg border border-landing-border text-landing-text hover:bg-landing-card"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" />Traitement...</> : 'Confirmer la réservation'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && reservationResult && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="mb-4 text-landing-text font-semibold text-xl">Réservation confirmée</h2>
              <p className="text-landing-text-muted mb-8 max-w-md mx-auto">
                Votre réservation a été confirmée. Vous recevrez un email et un SMS de confirmation.
              </p>
              <div className="rounded-lg p-6 mb-8 text-left max-w-md mx-auto bg-landing-bg border border-landing-border">
                <div className="space-y-3">
                  {createdState?.reservationId && (
                    <div className="flex items-center justify-between pb-3 border-b border-landing-border">
                      <span className="text-landing-text-muted">Référence</span>
                      <span className="font-mono text-xs font-medium text-landing-gold truncate max-w-[180px]">{(createdState as { confirmationCode?: string }).confirmationCode ?? createdState.reservationId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-landing-text-muted">Lieu</span>
                    <span className="font-medium text-landing-text">{pendingReservation?.venueName ?? createdState?.venueName ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-landing-text-muted">Date</span>
                    <span className="font-medium text-landing-text">
                      {new Date(pendingReservation?.date ?? createdState?.startAt ?? '').toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-landing-text-muted">Heure</span>
                    <span className="font-medium text-landing-text">{pendingReservation?.time ?? (createdState?.startAt ? new Date(createdState.startAt).toTimeString().slice(0, 5) : '—')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-landing-text-muted">
                      {createdState?.bookingType === 'ROOM' ? 'Chambre' : createdState?.bookingType === 'SEAT' ? 'Siège' : 'Table'}
                    </span>
                    <span className="font-medium text-landing-text">
                      {createdState?.bookingType === 'ROOM' && createdState?.roomNumber != null
                        ? `Chambre ${createdState.roomNumber}`
                        : createdState?.bookingType === 'SEAT' && createdState?.seatNumber != null
                          ? `Siège ${createdState.seatNumber}`
                          : `Table ${pendingReservation?.tableNumber ?? createdState?.tableNumber ?? '—'}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mb-8">
                {createdState?.reservationId && (
                  <button
                    type="button"
                    onClick={() => setTicketOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-landing-gold text-landing-gold hover:bg-landing-gold/10 font-medium"
                  >
                    <QrCode className="w-5 h-5" />
                    Afficher le ticket & Imprimer
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
                >
                  Voir mes réservations
                </Link>
                <Link
                  to="/explorer"
                  className="px-6 py-3 rounded-lg border border-landing-gold text-landing-gold hover:bg-landing-gold/10"
                >
                  Nouvelle réservation
                </Link>
              </div>
              {createdState?.reservationId && (
                <ReservationTicket
                  open={ticketOpen}
                  onOpenChange={setTicketOpen}
                  ticket={createdState.reservationId && createdState.startAt && createdState.endAt ? {
                    _id: createdState.reservationId,
                    confirmationCode: (createdState as { confirmationCode?: string }).confirmationCode,
                    startAt: createdState.startAt,
                    endAt: createdState.endAt,
                    status: 'CONFIRMED',
                    venueName: createdState.venueName,
                    venueAddress: createdState.venueAddress,
                    venueCity: createdState.venueCity,
                    bookingType: createdState.bookingType,
                    tableNumber: createdState.tableNumber,
                    roomNumber: createdState.roomNumber,
                    seatNumber: createdState.seatNumber,
                    price: createdState.price,
                    partySize: createdState.partySize,
                  } : null}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
