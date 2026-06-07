'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Eye, Trash2, RefreshCcw, ChevronLeft, ChevronRight, CalendarDays, Users, MapPin, Phone, Mail } from 'lucide-react';
import {
  listSOSConseil,
  updateSOSConseilStatus,
  updateSOSConseilRecommendedVenues,
  deleteSOSConseil,
  type SOSConseilRecord,
} from '@/lib/api/sos-conseil';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

function formatBudgetFr(code?: string): string | undefined {
  if (!code?.trim()) return undefined;
  const map: Record<string, string> = {
    moins_100: 'Moins de 100 TND',
    '100_300': '100–300 TND',
    '300_600': '300–600 TND',
    '600_1000': '600–1 000 TND',
    plus_1000: 'Plus de 1 000 TND',
  };
  return map[code] ?? code.replace(/_/g, ' ');
}

function formatContactPreferenceFr(v?: string): string | undefined {
  if (!v) return undefined;
  return (
    ({
      whatsapp: 'WhatsApp',
      phone: 'Téléphone',
      email: 'Email',
    }) as Record<string, string>
  )[v] ?? v;
}

function formatAgeRanges(r: SOSConseilRecord): string {
  if (r.averageAgeRanges?.length) return r.averageAgeRanges.map((x) => `${x} ans`).join(', ');
  if (r.averageAgeRange) return `${r.averageAgeRange} ans`;
  return '—';
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Nouveau',
  in_review: 'En cours',
  contacted: 'Répondu',
  closed: 'Converti',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    contacted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  
  const style = styles[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700';
  const label = STATUS_LABEL[status] ?? status;
  
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border ${style}`}>
      <div className={`size-1.5 rounded-full ${status === 'new' ? 'bg-blue-400' : status === 'in_review' ? 'bg-amber-400' : status === 'contacted' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      {label}
    </Badge>
  );
}

function DetailModal({ req, onClose }: { req: SOSConseilRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState<SOSConseilRecord>(req);
  const [recoDraft, setRecoDraft] = useState(req.adminRecommendedVenues ?? '');

  useEffect(() => {
    setCurrent(req);
    setRecoDraft(req.adminRecommendedVenues ?? '');
  }, [req]);

  const { mutate: changeStatus, isPending } = useMutation({
    mutationFn: (s: SOSConseilRecord['status']) => updateSOSConseilStatus(current._id, s),
    onSuccess: (updated) => {
      setCurrent((prev) => ({ ...prev, ...updated }));
      queryClient.invalidateQueries({ queryKey: ['admin', 'sos-conseil'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const { mutate: saveReco, isPending: savingReco } = useMutation({
    mutationFn: () =>
      updateSOSConseilRecommendedVenues(current._id, recoDraft.trim()),
    onSuccess: (updated) => {
      setCurrent((prev) => ({ ...prev, ...updated }));
      queryClient.invalidateQueries({ queryKey: ['admin', 'sos-conseil'] });
      toast.success('Recommandations enregistrées');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Sparkles className="size-5 text-amber-400" />
                Demande SOS Conseil
              </DialogTitle>
              <DialogDescription className="text-zinc-400 mt-1">
                {new Date(current.createdAt).toLocaleString('fr-FR')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Contact Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="size-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="size-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Nom complet</p>
                <p className="text-sm font-medium text-zinc-100">{current.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Phone className="size-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Téléphone</p>
                <p className="text-sm font-medium text-zinc-100">{current.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="size-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Mail className="size-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm font-medium text-zinc-100">{current.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="size-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                <CalendarDays className="size-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Date souhaitée</p>
                <p className="text-sm font-medium text-zinc-100">
                  {current.preferredDate ? new Date(current.preferredDate).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Occasion</p>
              <p className="text-sm font-medium text-zinc-100 capitalize">{current.occasionType.replace('_', ' ')}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Participants</p>
              <p className="text-sm font-medium text-zinc-100">{current.participantsCount} personnes</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Tranches d&apos;âge</p>
              <p className="text-sm font-medium text-zinc-100">{formatAgeRanges(current)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Région</p>
              <p className="text-sm font-medium text-zinc-100 flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {current.preferredRegion}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Catégorie</p>
              <p className="text-sm font-medium text-zinc-100 capitalize">{current.preferredCategory.replace('_', ' ')}</p>
            </div>
            {current.budgetRange ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Budget</p>
                <p className="text-sm font-medium text-amber-300/95">
                  {formatBudgetFr(current.budgetRange) ?? current.budgetRange}
                </p>
              </div>
            ) : null}
            {(current.contactPreference || current.ambianceTags?.length) ? (
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 pt-2">
                {current.contactPreference ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">Contact préféré</p>
                    <p className="text-sm font-medium text-zinc-100">
                      {formatContactPreferenceFr(current.contactPreference) ?? '—'}
                    </p>
                  </div>
                ) : null}
                {current.ambianceTags && current.ambianceTags.length > 0 ? (
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-xs text-zinc-500">Ambiance / critères</p>
                    <div className="flex flex-wrap gap-1.5">
                      {current.ambianceTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-400/12 border border-amber-400/25 text-[11px] text-amber-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {current.preferredTime && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Heure souhaitée</p>
                <p className="text-sm font-medium text-zinc-100">{current.preferredTime}</p>
              </div>
            )}
          </div>

          {/* Synthèse assistant */}
          {current.aiAssistSummary && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <Sparkles className="size-3.5 text-amber-400" />
                Résumé assistant
              </p>
              <div className="bg-amber-500/5 rounded-lg p-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap border border-amber-500/20">
                {current.aiAssistSummary}
              </div>
            </div>
          )}

          {/* Details */}
          {current.details ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Détails</p>
              <div className="bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap border border-zinc-700/50">
                {current.details}
              </div>
            </div>
          ) : null}

          {/* Recommandations venues (manuel) */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <p className="text-xs font-medium text-zinc-400">Recommandations (lieux, notes pour l&apos;équipe)</p>
            <Textarea
              value={recoDraft}
              onChange={(e) => setRecoDraft(e.target.value)}
              placeholder="Liste manuelle ou liens venues…"
              className="min-h-[140px] bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm"
            />
            <Button
              type="button"
              size="sm"
              disabled={savingReco || recoDraft === (current.adminRecommendedVenues ?? '')}
              onClick={() => saveReco()}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {savingReco ? '…' : 'Enregistrer les recommandations'}
            </Button>
          </div>

          {/* Status */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Changer le statut</p>
            <div className="flex flex-wrap gap-2">
              {(['new', 'in_review', 'contacted', 'closed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isPending || current.status === s}
                  onClick={() => changeStatus(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    current.status === s
                      ? 'bg-amber-500 text-black border-amber-500 cursor-default'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-amber-500/40 hover:text-amber-400'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSOSConseilPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<SOSConseilRecord | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'sos-conseil', page, status],
    queryFn: () => listSOSConseil({ page, status: (status === 'all' ? '' : status) || undefined }),
  });

  const { mutate: remove } = useMutation({
    mutationFn: deleteSOSConseil,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sos-conseil'] });
      toast.success('Demande supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const requests = data?.data ?? [];

  return (
    <>
      {selected && <DetailModal req={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="size-6 text-amber-400" />
              SOS Conseil
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Demandes de conseil personnalisé</p>
          </div>
          {data && (
            <Badge variant="outline" className="bg-zinc-800/50 text-zinc-300 border-zinc-700">
              {data.total} demande{data.total !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-9 border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="new">Nouveau</SelectItem>
                  <SelectItem value="in_review">En cours</SelectItem>
                  <SelectItem value="contacted">Répondu</SelectItem>
                  <SelectItem value="closed">Converti</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 gap-2"
              >
                <RefreshCcw className="size-4" />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-zinc-800" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <div className="size-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                  <Sparkles className="size-8" />
                </div>
                <p className="text-sm font-medium text-zinc-400">Aucune demande SOS Conseil</p>
                <p className="text-xs mt-1 text-zinc-500">Les demandes apparaîtront ici</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800">
                    <tr>
                      {['Nom', 'Téléphone', 'Occasion', 'Participants', 'Catégorie', 'Région', 'Statut', 'Date', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {requests.map((req) => (
                      <tr key={req._id} className="hover:bg-zinc-800/40 transition-colors duration-150">
                        <td className="px-4 py-3 font-medium text-zinc-100">{req.fullName}</td>
                        <td className="px-4 py-3 text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3.5 text-zinc-500" />
                            {req.phone}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 capitalize">{req.occasionType.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <Users className="size-3.5 text-zinc-500" />
                            {req.participantsCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 capitalize">{req.preferredCategory.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-zinc-500" />
                            {req.preferredRegion}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelected(req)}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-zinc-400 hover:text-amber-400 transition-all duration-200"
                              title="Voir les détails"
                              aria-label="Voir les détails"
                            >
                              <Eye className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Supprimer la demande de ${req.fullName} ?`)) remove(req._id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-all duration-200"
                              title="Supprimer"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {data && data.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                    <span className="text-sm text-zinc-500">
                      Page {data.page} / {data.pages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={data.page <= 1}
                        className="p-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 disabled:opacity-40 hover:border-zinc-600 hover:text-zinc-200 transition-all duration-200"
                        aria-label="Page précédente"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={data.page >= data.pages}
                        className="p-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 disabled:opacity-40 hover:border-zinc-600 hover:text-zinc-200 transition-all duration-200"
                        aria-label="Page suivante"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
