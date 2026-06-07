import { useRef, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export interface TicketData {
  _id: string;
  confirmationCode?: string;
  startAt: string;
  endAt: string;
  status: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  bookingType?: 'TABLE' | 'ROOM' | 'SEAT';
  tableNumber?: number;
  roomNumber?: number;
  seatNumber?: number;
  price?: number;
  partySize?: number;
  /** For QR: use confirmationCode when present, else _id */
  qrPayload?: string;
}

interface ReservationTicketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketData | null;
}

function makeQRPayload(ticket: TicketData): string {
  if (ticket.qrPayload) return ticket.qrPayload;
  const code = ticket.confirmationCode || ticket._id;
  return JSON.stringify({ code, id: ticket._id });
}

function bookingLabel(t: TicketData): string {
  if (t.bookingType === 'ROOM') return 'Chambre';
  if (t.bookingType === 'SEAT') return 'Place';
  return 'Table';
}
function bookingDetail(t: TicketData): string {
  if (t.bookingType === 'ROOM' && t.roomNumber != null) return `Chambre ${t.roomNumber}`;
  if (t.bookingType === 'SEAT' && t.seatNumber != null) return `Siège ${t.seatNumber}`;
  if (t.tableNumber != null) return `Table ${t.tableNumber}`;
  return '-';
}

export function ReservationTicket({ open, onOpenChange, ticket }: ReservationTicketProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const handlePrint = () => {
    if (!ticket) return;
    const qrDataUrl = qrCanvasRef.current?.toDataURL('image/png') ?? '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de réservation — Ma Reservation</title>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: 'Inter', system-ui, sans-serif; padding: 24px; max-width: 420px; margin: 0 auto; background: #fff; }
            .ticket { border: 3px solid #c9a227; padding: 28px; border-radius: 16px; background: #fff; }
            .brand { font-family: Georgia, serif; font-size: 20px; font-weight: 600; color: #c9a227; margin-bottom: 20px; text-align: center; }
            h1 { font-size: 16px; margin: 0 0 16px; color: #161616; font-weight: 600; }
            .row { margin-bottom: 10px; font-size: 14px; }
            .label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { color: #161616; font-weight: 500; }
            .qr { margin: 24px auto; display: block; padding: 12px; background: #fff; }
            .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
            .ref { font-family: monospace; font-size: 11px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="brand">Ma Reservation</div>
            <h1>Ticket de réservation</h1>
            <div class="row"><span class="label">Lieu</span><br/><span class="value">${ticket.venueName ?? '-'}</span></div>
            <div class="row"><span class="label">Adresse</span><br/><span class="value">${[ticket.venueAddress, ticket.venueCity].filter(Boolean).join(', ') || '-'}</span></div>
            <div class="row"><span class="label">Date / Heure</span><br/><span class="value">${new Date(ticket.startAt).toLocaleString('fr-FR')}</span></div>
            <div class="row"><span class="label">${bookingLabel(ticket)}</span><br/><span class="value">${bookingDetail(ticket)}</span></div>
            ${ticket.partySize ? `<div class="row"><span class="label">Nombre de personnes</span><br/><span class="value">${ticket.partySize}</span></div>` : ''}
            <div class="row"><span class="label">Prix</span><br/><span class="value">${ticket.price ?? '-'} TND</span></div>
            <div class="row"><span class="label">Code de réservation</span><br/><span class="ref">${ticket.confirmationCode ?? ticket._id}</span></div>
            <div class="qr"><img src="${qrDataUrl}" alt="QR" width="140" height="140"/></div>
            <div class="footer">Présentez ce ticket à l'établissement.</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  if (!ticket) return null;

  const qrPayload = makeQRPayload(ticket);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-landing-card border-2 border-landing-gold/50 text-landing-text max-w-md">
        <DialogHeader>
          <div className="text-center mb-2">
            <span className="text-landing-gold font-serif text-xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Ma Reservation</span>
          </div>
          <DialogTitle className="text-landing-text text-center">Ticket de réservation</DialogTitle>
        </DialogHeader>
        <div className="ticket-content space-y-4">
          <div className="rounded-xl border-2 border-landing-gold/40 p-5 bg-landing-bg/60">
            <div className="grid gap-3 text-sm">
              <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Lieu</span><br /><span className="font-medium text-landing-text">{ticket.venueName ?? '-'}</span></div>
              {(ticket.venueAddress || ticket.venueCity) && (
                <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Adresse</span><br /><span className="text-landing-text">{[ticket.venueAddress, ticket.venueCity].filter(Boolean).join(', ')}</span></div>
              )}
              <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Date / Heure</span><br /><span className="text-landing-text">{new Date(ticket.startAt).toLocaleString('fr-FR')}</span></div>
              <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Type</span><br /><span className="text-landing-text">{bookingLabel(ticket)} · {bookingDetail(ticket)}</span></div>
              {ticket.partySize != null && (
                <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Nombre de personnes</span><br /><span className="text-landing-text">{ticket.partySize}</span></div>
              )}
              <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Prix</span><br /><span className="text-landing-gold font-semibold text-lg">{ticket.price ?? '-'} TND</span></div>
              <div><span className="text-landing-text-muted text-xs uppercase tracking-wider">Code de réservation</span><br /><span className="font-mono text-sm font-semibold text-landing-gold">{ticket.confirmationCode ?? ticket._id}</span></div>
            </div>
          </div>
          <div className="flex justify-center p-5 bg-white rounded-xl border border-landing-border">
            <QRCodeSVG value={qrPayload} size={160} level="M" />
          </div>
          <div className="sr-only">
            <QRCodeCanvas ref={qrCanvasRef} value={qrPayload} size={140} level="M" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-3 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light shadow-[0_4px_14px_rgba(201,162,39,0.3)]"
          >
            Imprimer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
