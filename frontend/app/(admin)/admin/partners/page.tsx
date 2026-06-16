'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Handshake, RefreshCcw, ChevronLeft, ChevronRight, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import {
  listPartnerApplications,
  updatePartnerApplicationStatus,
  type PartnerApplicationRecord,
  type PartnerApplicationStatus,
} from '@/lib/api/partners';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  new: 'Nouveau',
  in_review: 'En cours',
  contacted: 'Contacté',
  closed: 'Clôturé',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    contacted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  const style = styles[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border ${style}`}>
      <div className={`size-1.5 rounded-full ${status === 'new' ? 'bg-blue-400' : status === 'in_review' ? 'bg-amber-400' : status === 'contacted' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export default function AdminPartnersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'partners', page, status],
    queryFn: () => listPartnerApplications({ page, status: (status === 'all' ? '' : status) || undefined }),
  });

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, s }: { id: string; s: PartnerApplicationStatus }) => updatePartnerApplicationStatus(id, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Handshake className="size-6 text-amber-400" />
            Partenaires
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Demandes de référencement d&apos;établissements</p>
        </div>
        {data && (
          <Badge variant="outline" className="border-zinc-700 bg-zinc-800/50 text-zinc-300">
            {data.total} demande{data.total !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="pb-4 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[180px] border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="in_review">En cours</SelectItem>
                <SelectItem value="contacted">Contacté</SelectItem>
                <SelectItem value="closed">Clôturé</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800">
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
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full bg-zinc-800" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-800/50">
                <Handshake className="size-8" />
              </div>
              <p className="text-sm font-medium text-zinc-400">Aucune demande de partenariat</p>
              <p className="mt-1 text-xs text-zinc-500">Les demandes apparaîtront ici</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/80">
                  <tr>
                    {['Établissement', 'Contact', 'Email', 'Téléphone', 'Ville', 'Statut', 'Date'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {items.map((req: PartnerApplicationRecord) => (
                    <tr key={req._id} className="transition-colors duration-150 hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-medium text-zinc-100">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-amber-400/70" />
                          {req.establishmentName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{req.contactName}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        <a href={`mailto:${req.email}`} className="flex items-center gap-1.5 hover:text-amber-400">
                          <Mail className="size-3.5 text-zinc-500" />
                          {req.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <a href={`tel:${req.phone}`} className="flex items-center gap-1.5 hover:text-amber-400">
                          <Phone className="size-3.5 text-zinc-500" />
                          {req.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-zinc-500" />
                          {req.city}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={req.status} onValueChange={(v) => changeStatus({ id: req._id, s: v as PartnerApplicationStatus })}>
                          <SelectTrigger className="h-8 w-[140px] border-zinc-700 bg-zinc-800/50 text-zinc-100">
                            <SelectValue><StatusBadge status={req.status} /></SelectValue>
                          </SelectTrigger>
                          <SelectContent className="border-zinc-800 bg-zinc-900">
                            <SelectItem value="new">Nouveau</SelectItem>
                            <SelectItem value="in_review">En cours</SelectItem>
                            <SelectItem value="contacted">Contacté</SelectItem>
                            <SelectItem value="closed">Clôturé</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                        {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data && data.pages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
                  <span className="text-sm text-zinc-500">Page {data.page} / {data.pages}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40" aria-label="Page précédente">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button type="button" onClick={() => setPage((p) => p + 1)} disabled={data.page >= data.pages} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40" aria-label="Page suivante">
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
  );
}
