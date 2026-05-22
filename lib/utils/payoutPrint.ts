import type { Payout } from '@/lib/api/payouts';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function printPayout(payout: Payout, ownerName?: string): void {
  const venue = typeof payout.venueId === 'object' ? payout.venueId : null;
  const owner = typeof payout.ownerId === 'object' ? payout.ownerId : null;

  const resolvedOwnerName = ownerName ?? owner?.name ?? '—';
  const venueName = venue?.name ?? '—';

  const itemRows = payout.items
    .map(
      (item, i) => `
      <tr>
        <td>${item.reservationCode ?? `#${i + 1}`}</td>
        <td>${fmtDate(item.startAt)}</td>
        <td>${fmtDate(item.endAt)}</td>
        <td class="num">${fmt(item.gross)} TND</td>
        <td class="num neg">-${fmt(item.commission)} TND</td>
        <td class="num pos">${fmt(item.net)} TND</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Virement — ${venueName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 28px; }
    .brand { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; }
    .brand span { color: #d4af37; }
    .invoice-meta { text-align: right; font-size: 12px; color: #666; }
    .invoice-meta strong { display: block; font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .meta-block h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .meta-block p { font-size: 13px; color: #1a1a1a; line-height: 1.6; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #f0f9f4; color: #16a34a; border: 1px solid #bbf7d0; }
    .totals-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .total-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    .total-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 6px; }
    .total-card .value { font-size: 18px; font-weight: 700; }
    .value.gross { color: #1a1a1a; }
    .value.commission { color: #dc2626; }
    .value.net { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; font-weight: 600; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #374151; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.neg { color: #dc2626; }
    td.pos { color: #16a34a; font-weight: 600; }
    tfoot td { padding: 10px 12px; font-weight: 700; font-size: 13px; border-top: 2px solid #e5e7eb; }
    tfoot td.num { text-align: right; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Ma <span>Réservation</span></div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Plateforme de réservation premium</div>
    </div>
    <div class="invoice-meta">
      <strong>Relevé de virement</strong>
      <span>Référence : ${payout._id.slice(-8).toUpperCase()}</span><br />
      <span>Généré le ${fmtDate(new Date().toISOString())}</span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <h3>Propriétaire</h3>
      <p><strong>${resolvedOwnerName}</strong></p>
      ${owner?.email ? `<p>${owner.email}</p>` : ''}
      ${(owner as any)?.phone ? `<p>${(owner as any).phone}</p>` : ''}
    </div>
    <div class="meta-block">
      <h3>Établissement</h3>
      <p><strong>${venueName}</strong></p>
      <p>Période : ${fmtDate(payout.periodStart)} → ${fmtDate(payout.periodEnd)}</p>
      <p>Statut : <span class="status-badge">${
        payout.status === 'paid' ? 'Payé' :
        payout.status === 'approved' ? 'Approuvé' :
        payout.status === 'pending' ? 'En attente' :
        payout.status === 'on_hold' ? 'Suspendu' : 'Rejeté'
      }</span></p>
      ${payout.status === 'paid' && payout.paidAt ? `<p style="margin-top:4px;font-size:11px;color:#6b7280;">Payé le ${fmtDate(payout.paidAt)}${payout.paymentReference ? ` · Réf : ${payout.paymentReference}` : ''}</p>` : ''}
    </div>
  </div>

  <div class="totals-row">
    <div class="total-card">
      <div class="label">Montant brut</div>
      <div class="value gross">${fmt(payout.gross)} TND</div>
    </div>
    <div class="total-card">
      <div class="label">Commission plateforme (${payout.commissionRate ?? '—'}%)</div>
      <div class="value commission">-${fmt(payout.commission)} TND</div>
    </div>
    <div class="total-card">
      <div class="label">Net propriétaire</div>
      <div class="value net">${fmt(payout.net)} TND</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code réservation</th>
        <th>Arrivée</th>
        <th>Départ</th>
        <th style="text-align:right">Brut</th>
        <th style="text-align:right">Commission</th>
        <th style="text-align:right">Net</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="font-weight:700;">Total (${payout.items.length} réservation${payout.items.length > 1 ? 's' : ''})</td>
        <td class="num">${fmt(payout.gross)} TND</td>
        <td class="num neg">-${fmt(payout.commission)} TND</td>
        <td class="num pos">${fmt(payout.net)} TND</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    Ma Réservation · Plateforme de réservation premium · Ce document est généré automatiquement.
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
