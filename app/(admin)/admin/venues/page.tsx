'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminVenues, fetchAdminOwners, deleteAdminVenue } from '@/lib/api/admin';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, Search, ExternalLink, Building2, Eye, Coffee, Bed, Film, CalendarDays, MoreHorizontal, Grid3X3, List, Trash2, Loader2 } from 'lucide-react';
import { VENUE_TYPE_LABELS } from '@/app/constants/venueTypes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type VenueRow = { _id: string; name: string; type: string; city: string; coverImage?: string };
type OwnerRef = { _id: string; fullName?: string; email?: string };
type VenueRowWithOwner = VenueRow & { ownerId?: OwnerRef | string };

// Type-specific icons and colors
const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; borderColor: string }> = {
  CAFE: { icon: Coffee, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  RESTAURANT: { icon: Building2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  HOTEL: { icon: Bed, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  CINEMA: { icon: Film, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  EVENT_SPACE: { icon: CalendarDays, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
};

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? { icon: MapPin, color: 'text-zinc-400', bgColor: 'bg-zinc-800', borderColor: 'border-zinc-700' };
  const Icon = config.icon;
  const label = VENUE_TYPE_LABELS[type] ?? type;

  return (
    <Badge 
      variant="outline" 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

function VenueImage({ coverImage, name }: { coverImage?: string; name: string }) {
  if (coverImage) {
    return (
      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50 shadow-lg group">
        <Image src={coverImage} alt={name} fill className="object-cover transition-transform duration-200 group-hover:scale-110" sizes="56px" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
      </div>
    );
  }
  return (
    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center text-zinc-600 shadow-lg">
      <MapPin className="size-6" />
    </div>
  );
}

export default function AdminVenuesPage() {
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? '');
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [withoutOwner, setWithoutOwner] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<VenueRowWithOwner | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminVenue(id),
    onSuccess: (data) => {
      const name = (data?.deleted?.venue as string) ?? 'Lieu';
      toast.success(`${name} supprimé`, {
        description: `Tables: ${data?.deleted?.tables ?? 0} · Chambres: ${data?.deleted?.rooms ?? 0} · Réservations: ${data?.deleted?.reservations ?? 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
      setPendingDelete(null);
    },
    onError: (err) => {
      toast.error('Suppression échouée', {
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
      });
    },
  });

  // Sync filter when URL changes (sidebar navigation between categories)
  useEffect(() => {
    setTypeFilter(searchParams.get('type') ?? '');
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  const { data: venuesData = [], isLoading } = useQuery({
    queryKey: ['admin', 'venues', typeFilter, q, ownerFilter, withoutOwner],
    queryFn: () =>
      fetchAdminVenues({
        type: typeFilter || undefined,
        q: q || undefined,
        ownerId: ownerFilter || undefined,
        withoutOwner,
      }),
  });
  const venues = venuesData as VenueRowWithOwner[];
  const { data: owners = [] } = useQuery({
    queryKey: ['admin', 'owners'],
    queryFn: fetchAdminOwners,
  });

  // Count by type
  const typeCounts = venues.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {typeFilter ? (VENUE_TYPE_LABELS[typeFilter] ?? 'Lieux') : 'Lieux'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {venues.length} {typeFilter ? 'établissement' : 'lieu'}{venues.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            aria-label="Changer le mode d'affichage"
          >
            {viewMode === 'table' ? <Grid3X3 className="size-4" /> : <List className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Pills */}
      {!isLoading && venues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all duration-200 ${
              typeFilter === ''
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10'
                : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <Building2 className="size-3.5" />
            Tous
            <span className="tabular-nums font-semibold">{venues.length}</span>
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all duration-200 ${
                typeFilter === type
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <TypeBadge type={type} />
              <span className="tabular-nums font-semibold">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px] h-9 border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                placeholder="Rechercher (nom, ville…)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-9 border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <Select value={ownerFilter || 'all'} onValueChange={(v) => setOwnerFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[220px] h-9 border-zinc-700 bg-zinc-800/50 text-zinc-100">
                <SelectValue placeholder="Proprietaire" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">Tous proprietaires</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner._id} value={owner._id}>
                    {owner.fullName || owner.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={withoutOwner ? 'default' : 'outline'}
              onClick={() => setWithoutOwner((v) => !v)}
              className="h-9"
            >
              Sans proprietaire
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table or Grid View */}
      {isLoading ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                  <TableHead className="w-16 text-zinc-400">Image</TableHead>
                  <TableHead className="text-zinc-400">Nom</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Ville</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-zinc-800" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : venues.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <div className="size-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
              <MapPin className="size-8" />
            </div>
            <p className="text-sm font-medium text-zinc-400">Aucun lieu trouvé</p>
            <p className="text-xs mt-1 text-zinc-500">
              {q || typeFilter ? 'Essayez de modifier vos filtres' : 'Les lieux créés apparaîtront ici'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                  <TableHead className="text-zinc-400 pl-4">Lieu</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Ville</TableHead>
                  <TableHead className="text-zinc-400">Proprietaire</TableHead>
                  <TableHead className="text-right pr-4 text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((v) => (
                  <TableRow key={v._id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors duration-150 group">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <VenueImage coverImage={v.coverImage} name={v.name} />
                        <div>
                          <p className="font-medium text-zinc-100 group-hover:text-white transition-colors duration-150">{v.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            ID: {v._id.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={v.type} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                        <MapPin className="size-3.5 text-zinc-500" />
                        {v.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      {typeof v.ownerId === 'object' ? (v.ownerId.fullName || v.ownerId.email || '—') : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="size-8 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                          aria-label="Voir"
                        >
                          <Link href={`/lieu/${v._id}`} target="_blank">
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                              aria-label="Plus d'actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 border-zinc-800 bg-zinc-900">
                            <DropdownMenuItem asChild>
                              <Link href={v.type === 'HOTEL' ? `/admin/hotels/${v._id}` : `/admin/venues/${v._id}`} className="flex items-center gap-2">
                                <ExternalLink className="size-4" />
                                Modifier
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/lieu/${v._id}`} target="_blank" className="flex items-center gap-2">
                                <Eye className="size-4" />
                                Voir sur le site
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => { e.preventDefault(); setPendingDelete(v); }}
                              className="flex items-center gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            >
                              <Trash2 className="size-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <Card key={v._id} className="group border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 overflow-hidden">
              <div className="relative h-40 w-full bg-zinc-800 overflow-hidden">
                {v.coverImage ? (
                  <>
                    <Image src={v.coverImage} alt={v.name} fill className="object-cover transition-transform duration-300 group-hover:scale-110" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <MapPin className="size-12 text-zinc-700" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <TypeBadge type={v.type} />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-100 truncate group-hover:text-white transition-colors duration-150">{v.name}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-zinc-500">
                      <MapPin className="size-3.5" />
                      {v.city}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-600 transition-all duration-200"
                  >
                    <Link href={v.type === 'HOTEL' ? `/admin/hotels/${v._id}` : `/admin/venues/${v._id}`} className="flex items-center gap-1.5 justify-center">
                      <ExternalLink className="size-3.5" />
                      Modifier
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                  >
                    <Link href={`/lieu/${v._id}`} target="_blank">
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(v)}
                    className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Supprimer définitivement ce lieu ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <span className="font-semibold text-zinc-200">{pendingDelete?.name}</span> sera supprimé
              avec toutes ses tables, chambres, sièges, scènes 360°, hotspots, événements et
              réservations associées. Cette action est <span className="text-red-400 font-semibold">irréversible</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteMutation.mutate(pendingDelete._id);
              }}
              className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/40"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Suppression…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="size-4" />
                  Supprimer
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
