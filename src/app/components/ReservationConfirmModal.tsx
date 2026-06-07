import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';

export interface ReservationGuestForm {
  guestFirstName: string;
  guestLastName: string;
  guestPhone: string;
  partySize: number;
}

export interface ReservationConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capacity: number;
  bookingLabel: string; // "Table 3", "Chambre 101", "Siège 2"
  price: number;
  dateLabel: string;
  onSubmit: (form: ReservationGuestForm) => Promise<void>;
}

const TUNISIAN_PHONE_REGEX = /^(\+216|216)?\s*[0-9]{8}$/;

function normalizePhone(value: string): string {
  return value.replace(/\s/g, '').replace(/^216/, '+216');
}

export function ReservationConfirmModal({
  open,
  onOpenChange,
  capacity,
  bookingLabel,
  price,
  dateLabel,
  onSubmit,
}: ReservationConfirmModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!firstName.trim()) err.guestFirstName = 'Prénom requis';
    if (!lastName.trim()) err.guestLastName = 'Nom requis';
    if (!phone.trim()) err.guestPhone = 'Téléphone requis';
    else {
      const normalized = normalizePhone(phone);
      if (!TUNISIAN_PHONE_REGEX.test(normalized) && !/^[0-9]{8}$/.test(normalized)) {
        err.guestPhone = 'Format invalide (ex: 12345678 ou +21612345678)';
      }
    }
    if (partySize < 1) err.partySize = 'Au moins 1 personne';
    if (partySize > capacity) err.partySize = `Capacité max: ${capacity} personnes`;
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({
        guestFirstName: firstName.trim(),
        guestLastName: lastName.trim(),
        guestPhone: normalizePhone(phone) || phone.trim(),
        partySize,
      });
      toast.success('Réservation confirmée !');
      onOpenChange(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setPartySize(1);
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-landing-card border-landing-border text-landing-text max-w-md">
        <DialogHeader>
          <DialogTitle className="text-landing-text">Confirmer la réservation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-landing-gold/30 bg-landing-bg/50 p-3 text-sm">
            <p className="text-landing-text-muted">Récapitulatif</p>
            <p className="font-medium text-landing-text mt-1">{bookingLabel}</p>
            <p className="text-landing-text-muted">{dateLabel}</p>
            <p className="text-landing-gold font-semibold mt-1">{price} TND</p>
            <p className="text-landing-text-muted text-xs mt-1">Capacité max: {capacity} personnes</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-landing-text mb-1">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="w-full px-3 py-2 rounded-lg bg-landing-bg border border-landing-border text-landing-text placeholder-landing-text-muted/60 focus:ring-2 focus:ring-landing-gold"
              />
              {errors.guestFirstName && <p className="text-red-400 text-xs mt-0.5">{errors.guestFirstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-landing-text mb-1">Nom *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="w-full px-3 py-2 rounded-lg bg-landing-bg border border-landing-border text-landing-text placeholder-landing-text-muted/60 focus:ring-2 focus:ring-landing-gold"
              />
              {errors.guestLastName && <p className="text-red-400 text-xs mt-0.5">{errors.guestLastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-landing-text mb-1">Téléphone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="12 345 678 ou +216 12 345 678"
              className="w-full px-3 py-2 rounded-lg bg-landing-bg border border-landing-border text-landing-text placeholder-landing-text-muted/60 focus:ring-2 focus:ring-landing-gold"
            />
            {errors.guestPhone && <p className="text-red-400 text-xs mt-0.5">{errors.guestPhone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-landing-text mb-1">Nombre de personnes *</label>
            <input
              type="number"
              min={1}
              max={capacity}
              value={partySize}
              onChange={(e) => setPartySize(Math.min(capacity, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg bg-landing-bg border border-landing-border text-landing-text focus:ring-2 focus:ring-landing-gold"
            />
            <p className="text-landing-text-muted text-xs mt-0.5">Capacité max: {capacity} personnes</p>
            {errors.partySize && <p className="text-red-400 text-xs mt-0.5">{errors.partySize}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-landing-border text-landing-text hover:bg-landing-bg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light disabled:opacity-60"
            >
              {loading ? 'En cours...' : 'Confirmer la réservation'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
