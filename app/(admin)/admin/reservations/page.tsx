'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchAdminReservations, forceCancelAdminReservation, markAdminReservationRefunded, addAdminReservationNote } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, FileText, RotateCcw, ShieldAlert } from 'lucide-react';

type AdminReservationRow = {
  _id: string;
  confirmationCode?: string;
  reservationCode?: string;
  venueId?: { name?: string };
  startAt?: string;
  endAt?: string;
  status?: string;
  paymentStatus?: string;
  totalPrice?: number;
  customerFirstName?: string;
  customerLastName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  userId?: { fullName?: string; email?: string };
  internalNotes?: string[];
};

function StatusBadge({ status }: { status?: string }) {
  const key = String(status ?? '').toLowerCase();
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    checked_in: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    no_show: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  const style = styles[key] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${style}`}>{status ?? '—'}</span>;
}

function PaymentBadge({ paymentStatus }: { paymentStatus?: string }) {
  const key = String(paymentStatus ?? '').toLowerCase();
  const styles: Record<string, string> = {
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    unpaid: 'bg-zinc-700/50 text-zinc-300 border-zinc-600',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    refunded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  const style = styles[key] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${style}`}>{paymentStatus ?? '—'}</span>;
}

function guestLabel(row: AdminReservationRow) {
  const fullName = [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const guest = [row.guestFirstName, row.guestLastName].filter(Boolean).join(' ').trim();
  if (guest) return guest;
  return row.userId?.fullName ?? row.userId?.email ?? '—';
}

export default function AdminReservationsPage() {
  const qc = useQueryClient();
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['admin', 'reservations'],
    queryFn: () => fetchAdminReservations(),
  });

  const list = useMemo(
    () => (reservations as AdminReservationRow[]).slice().sort((a, b) => Number(new Date(b.startAt ?? 0)) - Number(new Date(a.startAt ?? 0))),
    [reservations]
  );

  const forceCancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => forceCancelAdminReservation(id, reason),
    onSuccess: () => {
      toast.success('Réservation annulée.');
      qc.invalidateQueries({ queryKey: ['admin', 'reservations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRefundedMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => markAdminReservationRefunded(id, reason),
    onSuccess: () => {
      toast.success('Réservation marquée remboursée.');
      qc.invalidateQueries({ queryKey: ['admin', 'reservations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => addAdminReservationNote(id, note),
    onSuccess: () => {
      toast.success('Note admin ajoutée.');
      qc.invalidateQueries({ queryKey: ['admin', 'reservations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onForceCancel(row: AdminReservationRow) {
    const reason = window.prompt('Motif obligatoire pour annuler cette réservation')?.trim() ?? '';
    if (!reason) return toast.error('Motif requis.');
    forceCancelMut.mutate({ id: row._id, reason });
  }

  function onMarkRefunded(row: AdminReservationRow) {
    const reason = window.prompt('Motif obligatoire pour marquer remboursé')?.trim() ?? '';
    if (!reason) return toast.error('Motif requis.');
    markRefundedMut.mutate({ id: row._id, reason });
  }

  function onAddNote(row: AdminReservationRow) {
    const note = window.prompt('Ajouter une note admin (max 2000 caractères)')?.trim() ?? '';
    if (!note) return toast.error('Note requise.');
    noteMut.mutate({ id: row._id, note });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Réservations</h1>
          <p className="mt-1 text-sm text-zinc-400">{list.length} réservation{list.length !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Calendar className="size-4 text-amber-400" />
            Supervision des réservations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                  {['Code', 'Client', 'Lieu', 'Date', 'Statut', 'Paiement', 'Montant', 'Actions'].map((h) => (
                    <TableHead key={h} className="text-zinc-400">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-zinc-800" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <ShieldAlert className="size-12 mb-3" />
              <p className="text-sm font-medium">Aucune réservation</p>
              <p className="text-xs mt-1">Les réservations apparaîtront ici</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                  {['Code', 'Client', 'Lieu', 'Date', 'Statut', 'Paiement', 'Montant', 'Actions'].map((h) => (
                    <TableHead key={h} className="text-zinc-400">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r._id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors duration-150">
                    <TableCell>
                      <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 font-mono">
                        {r.reservationCode ?? r.confirmationCode ?? r._id.slice(-8)}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-300">{guestLabel(r)}</TableCell>
                    <TableCell className="text-sm text-zinc-300 font-medium">
                      {typeof r.venueId === 'object' ? r.venueId?.name : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-zinc-500" />
                        {r.startAt ? new Date(r.startAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '—'}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell><PaymentBadge paymentStatus={r.paymentStatus} /></TableCell>
                    <TableCell className="text-sm text-zinc-300 tabular-nums">
                      {typeof r.totalPrice === 'number' ? `${r.totalPrice.toFixed(2)} DT` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onForceCancel(r)}
                          disabled={forceCancelMut.isPending}
                          className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => onMarkRefunded(r)}
                          disabled={markRefundedMut.isPending}
                          className="rounded border border-blue-500/30 px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <RotateCcw className="size-3" />
                            Rembourser
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddNote(r)}
                          disabled={noteMut.isPending}
                          className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700/40 disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <FileText className="size-3" />
                            Note
                          </span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

