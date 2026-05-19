'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAuditLogs, type AuditLogEntry } from '@/lib/api/admin-hotel';

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'VENUE_APPROVED', label: 'Hôtel approuvé' },
  { value: 'VENUE_REJECTED', label: 'Hôtel rejeté' },
  { value: 'VENUE_CHANGES_REQUESTED', label: 'Changements demandés' },
  { value: 'VENUE_SUSPENDED', label: 'Hôtel suspendu' },
  { value: 'VENUE_REINSTATED', label: 'Hôtel réactivé' },
  { value: 'VENUE_FEATURED', label: 'Mis en avant' },
  { value: 'RESERVATION_ACCEPTED', label: 'Réservation acceptée' },
  { value: 'RESERVATION_REJECTED', label: 'Réservation refusée' },
  { value: 'RESERVATION_MANUAL_CREATED', label: 'Réservation manuelle' },
  { value: 'RESERVATION_CHECKED_IN', label: 'Check-in' },
  { value: 'RESERVATION_CHECKED_OUT', label: 'Check-out' },
  { value: 'RESERVATION_CANCELLED', label: 'Réservation annulée' },
  { value: 'USER_CREATED', label: 'Utilisateur créé' },
  { value: 'LOGIN', label: 'Connexion' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Toutes les entités' },
  { value: 'venue', label: 'Hôtels' },
  { value: 'reservation', label: 'Réservations' },
  { value: 'user', label: 'Utilisateurs' },
  { value: 'payment', label: 'Paiements' },
];

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function actorLabel(entry: AuditLogEntry) {
  if (typeof entry.userId === 'object' && entry.userId) {
    return entry.userId.fullName ?? entry.userId.email ?? 'Admin';
  }
  return 'Système';
}

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs-all', action, entityType],
    queryFn: () =>
      fetchAuditLogs({
        action: action || undefined,
        entityType: entityType || undefined,
        limit: 200,
      }),
  });

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      <header className="border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-xl px-4 lg:px-6 py-4 sticky top-0 z-30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Sécurité</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">Audit logs</h1>
          </div>
          <span className="text-xs text-neutral-500 tabular-nums">
            {logs.length} entrée{logs.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs text-neutral-100 focus:border-amber-400/40 focus:outline-none"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0C0C0C]">{o.label}</option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 text-xs text-neutral-100 focus:border-amber-400/40 focus:outline-none"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0C0C0C]">{o.label}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="px-4 lg:px-6 py-5">
        {isLoading ? (
          <div className="text-center py-16 text-neutral-500">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            Chargement…
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center text-sm text-neutral-500">
            <ShieldAlert className="size-12 text-neutral-700 mx-auto mb-3" />
            Aucun événement ne correspond.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0C0C0C] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-neutral-600 bg-white/[0.02]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-3 py-3 font-medium">Action</th>
                  <th className="text-left px-3 py-3 font-medium">Entité</th>
                  <th className="text-left px-3 py-3 font-medium">Acteur</th>
                  <th className="text-left px-3 py-3 font-medium">IP</th>
                  <th className="text-left px-4 py-3 font-medium">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.map((entry) => (
                  <tr key={entry._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 text-xs text-neutral-400 tabular-nums whitespace-nowrap">{fmtTime(entry.timestamp)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded-md border border-white/15 bg-white/[0.04] text-neutral-200 px-2 py-0.5 text-[10px] font-mono">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-400">
                      {entry.entityType ?? '—'}
                      {entry.entityId && (
                        <span className="block text-[10px] text-neutral-600 font-mono mt-0.5">
                          {String(entry.entityId).slice(-8)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-300">{actorLabel(entry)}</td>
                    <td className="px-3 py-3 text-[10px] font-mono text-neutral-600">{entry.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 max-w-md">
                      {entry.details ? (
                        <pre className="text-[10px] text-neutral-500 font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(entry.details, null, 0).slice(0, 200)}
                        </pre>
                      ) : (
                        <span className="text-neutral-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
