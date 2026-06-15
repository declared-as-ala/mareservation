'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminVenues, fetchAdminOwners, deleteAdminVenue, assignVenueOwner, archiveAdminVenue, restoreAdminVenue, createAdminVenue } from '@/lib/api/admin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getVenueHref, getAdminVenueHref, getAdminVenueListHref } from '@/lib/venueHref';
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
import { MapPin, Search, ExternalLink, Building2, Eye, Coffee, Bed, Film, CalendarDays, MoreHorizontal, Grid3X3, List, Trash2, Loader2, User, UserPlus, ShieldAlert, Mail, Archive, ArchiveRestore, Plus, X } from 'lucide-react';
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

type VenueRow = { _id: string; name: string; type: string; slug?: string; city: string; coverImage?: string; archivedAt?: string | null };
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

function OwnerBadge({
  owner,
  ownerLabel,
  ownerEmail,
  venueId,
  onAssignClick,
  compact = false,
}: {
  owner?: OwnerRef | string;
  ownerLabel?: string;
  ownerEmail?: string;
  venueId: string;
  onAssignClick: () => void;
  compact?: boolean;
}) {
  if (!owner || (typeof owner === 'object' && !owner._id)) {
    return (
      <button
        type="button"
        onClick={onAssignClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300 hover:bg-red-500/15 hover:border-red-500/40 transition-all"
        aria-label="Assigner un propriétaire"
      >
        <ShieldAlert className="size-3" />
        Non assigné
      </button>
    );
  }
  const name = ownerLabel || (typeof owner === 'object' ? owner.fullName || owner.email : '');
  const email = ownerEmail || (typeof owner === 'object' ? owner.email : '');
  const id = typeof owner === 'object' ? owner._id : owner;
  const initial = (name || email || '?').charAt(0).toUpperCase();
  return (
    <Link
      href={`/admin/venues?ownerId=${id}`}
      title={email ? `${name} · ${email}` : name}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.06] pr-2.5 text-[11px] font-medium text-amber-200/90 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-200 transition-all',
        compact ? 'py-0.5 pl-0.5' : 'py-1 pl-1'
      )}
    >
      <span className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-bold shrink-0',
        compact ? 'size-4 text-[9px]' : 'size-5 text-[10px]'
      )}>
        {initial}
      </span>
      <span className="truncate max-w-[180px]">{name || email || 'Propriétaire'}</span>
    </Link>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? '');
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState(() => searchParams.get('ownerId') ?? '');
  const [withoutOwner, setWithoutOwner] = useState(() => searchParams.get('withoutOwner') === '1');
  const [pendingDelete, setPendingDelete] = useState<VenueRowWithOwner | null>(null);
  const [assignTarget, setAssignTarget] = useState<VenueRowWithOwner | null>(null);
  const [assigningOwnerId, setAssigningOwnerId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [archivedFilter, setArchivedFilter] = useState<'active' | 'only'>(
    () => (searchParams.get('archived') === 'only' ? 'only' : 'active'),
  );
  const queryClient = useQueryClient();

  async function handleAssignOwner() {
    if (!assignTarget) return;
    setIsAssigning(true);
    try {
      await assignVenueOwner(assignTarget._id, assigningOwnerId || null);
      toast.success(
        assigningOwnerId
          ? 'Propriétaire assigné'
          : 'Propriétaire retiré',
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
      setAssignTarget(null);
      setAssigningOwnerId('');
    } catch (err) {
      toast.error('Échec', {
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
      });
    } finally {
      setIsAssigning(false);
    }
  }

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
    setOwnerFilter(searchParams.get('ownerId') ?? '');
    setWithoutOwner(searchParams.get('withoutOwner') === '1');
    setArchivedFilter(searchParams.get('archived') === 'only' ? 'only' : 'active');
  }, [searchParams]);

  const { data: venuesData = [], isLoading } = useQuery({
    queryKey: ['admin', 'venues', typeFilter, q, ownerFilter, withoutOwner, archivedFilter],
    queryFn: () =>
      fetchAdminVenues({
        type: typeFilter || undefined,
        q: q || undefined,
        ownerId: ownerFilter || undefined,
        withoutOwner,
        archived: archivedFilter === 'only' ? 'only' : undefined,
      }),
  });

  async function handleArchive(v: VenueRowWithOwner) {
    try {
      await archiveAdminVenue(v._id);
      toast.success(`${v.name} archivé`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
    } catch (err) {
      toast.error('Échec', { description: err instanceof Error ? err.message : 'Réessayez.' });
    }
  }
  async function handleRestore(v: VenueRowWithOwner) {
    try {
      await restoreAdminVenue(v._id);
      toast.success(`${v.name} restauré`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
    } catch (err) {
      toast.error('Échec', { description: err instanceof Error ? err.message : 'Réessayez.' });
    }
  }
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

  const activeOwner = ownerFilter
    ? owners.find((o) => o._id === ownerFilter) ?? null
    : null;
  const unassignedCount = venues.filter(
    (v) => !v.ownerId || (typeof v.ownerId === 'object' && !v.ownerId._id),
  ).length;

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
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl"
          >
            <Plus className="size-4 mr-1.5" />
            Nouvel établissement
          </Button>
        </div>
      </div>

      {createOpen && (
        <CreateVenueModal
          defaultType={typeFilter || ''}
          onClose={() => setCreateOpen(false)}
          onCreated={(id, type) => {
            setCreateOpen(false);
            toast.success(`${VENUE_TYPE_LABELS[type] ?? 'Établissement'} créé.`);
            queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
            // Land in the new venue's own category list (e.g. a Café → cafés list),
            // regardless of which section it was created from.
            router.push(getAdminVenueListHref(type));
          }}
        />
      )}

      {/* Active owner filter banner */}
      {activeOwner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black text-sm font-bold shrink-0">
              {(activeOwner.fullName || activeOwner.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-200 truncate">
                Établissements de {activeOwner.fullName || activeOwner.email}
              </p>
              <p className="text-xs text-amber-200/60 truncate flex items-center gap-1.5">
                <Mail className="size-3" />
                {activeOwner.email}
                <span className="text-amber-200/30">·</span>
                <span>{venues.length} lieu{venues.length !== 1 ? 'x' : ''}</span>
              </p>
            </div>
          </div>
          <Link
            href="/admin/venues"
            className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
          >
            Effacer le filtre
          </Link>
        </div>
      )}

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
          <button
            type="button"
            onClick={() => setArchivedFilter(archivedFilter === 'only' ? 'active' : 'only')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
              archivedFilter === 'only'
                ? 'bg-zinc-700/40 text-zinc-200 border-zinc-600'
                : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Archive className="size-3.5" />
            Archivés
          </button>
          {unassignedCount > 0 && !withoutOwner && !ownerFilter && (
            <button
              type="button"
              onClick={() => setWithoutOwner(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border bg-red-500/[0.06] text-red-300 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
            >
              <ShieldAlert className="size-3.5" />
              Sans propriétaire
              <span className="tabular-nums font-semibold">{unassignedCount}</span>
            </button>
          )}
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
                      <OwnerBadge
                        owner={v.ownerId}
                        venueId={v._id}
                        onAssignClick={() => {
                          const cur = typeof v.ownerId === 'object' && v.ownerId ? v.ownerId._id : '';
                          setAssigningOwnerId(cur);
                          setAssignTarget(v);
                        }}
                      />
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
                          <Link href={getVenueHref(v)} target="_blank">
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
                              <Link href={getAdminVenueHref(v)} className="flex items-center gap-2">
                                <ExternalLink className="size-4" />
                                Modifier
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={getVenueHref(v)} target="_blank" className="flex items-center gap-2">
                                <Eye className="size-4" />
                                Voir sur le site
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                const cur = typeof v.ownerId === 'object' && v.ownerId ? v.ownerId._id : '';
                                setAssigningOwnerId(cur);
                                setAssignTarget(v);
                              }}
                              className="flex items-center gap-2"
                            >
                              <UserPlus className="size-4" />
                              {typeof v.ownerId === 'object' && v.ownerId ? 'Changer le propriétaire' : 'Assigner un propriétaire'}
                            </DropdownMenuItem>
                            {v.archivedAt ? (
                              <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); handleRestore(v); }}
                                className="flex items-center gap-2 text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10"
                              >
                                <ArchiveRestore className="size-4" />
                                Restaurer
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); handleArchive(v); }}
                                className="flex items-center gap-2"
                              >
                                <Archive className="size-4" />
                                Archiver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onSelect={(e) => { e.preventDefault(); setPendingDelete(v); }}
                              className="flex items-center gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            >
                              <Trash2 className="size-4" />
                              Supprimer définitivement
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
                <div className="mt-3">
                  <OwnerBadge
                    owner={v.ownerId}
                    venueId={v._id}
                    onAssignClick={() => {
                      const cur = typeof v.ownerId === 'object' && v.ownerId ? v.ownerId._id : '';
                      setAssigningOwnerId(cur);
                      setAssignTarget(v);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-600 transition-all duration-200"
                  >
                    <Link href={getAdminVenueHref(v)} className="flex items-center gap-1.5 justify-center">
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
                    <Link href={getVenueHref(v)} target="_blank">
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

      {/* Assign owner dialog */}
      <AlertDialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open && !isAssigning) {
            setAssignTarget(null);
            setAssigningOwnerId('');
          }
        }}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Lier <span className="text-amber-400">{assignTarget?.name}</span> à un propriétaire
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Sélectionnez un propriétaire d&apos;établissement. Il aura accès aux réservations, chambres et au tableau de bord de ce lieu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Select value={assigningOwnerId || 'none'} onValueChange={(v) => setAssigningOwnerId(v === 'none' ? '' : v)}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-900 text-zinc-100">
                <SelectValue placeholder="Choisir un propriétaire…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 max-h-[280px]">
                <SelectItem value="none">Aucun (retirer le propriétaire)</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner._id} value={owner._id}>
                    <span className="flex items-center gap-2">
                      <span className="size-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black text-[10px] font-bold flex items-center justify-center">
                        {(owner.fullName || owner.email).charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium">{owner.fullName || owner.email}</span>
                      {owner.fullName && (
                        <span className="text-zinc-500 text-xs">{owner.email}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {owners.length === 0 && (
              <p className="text-xs text-zinc-500">
                Aucun propriétaire enregistré. Créez un compte avec le rôle <strong>ESTABLISHMENT_OWNER</strong> dans /admin/users.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssigning} className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isAssigning}
              onClick={(e) => { e.preventDefault(); handleAssignOwner(); }}
              className="bg-amber-400 text-black hover:bg-amber-300"
            >
              {isAssigning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Enregistrement…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  {assigningOwnerId ? 'Lier' : 'Retirer'}
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

/* ─── Create-venue modal (works for every VenueType) ──────────────── */
const TUNISIAN_CITIES = [
  'Tunis', 'Hammamet', 'Sousse', 'Sfax', 'Monastir', 'Djerba', 'Tozeur',
  'Nefta', 'Tabarka', 'Mahdia', 'Nabeul', 'Bizerte', 'Kairouan', 'Gabès',
  'La Marsa', 'Gammarth', 'Sidi Bou Saïd', 'Radès',
];

function reservationModesFor(type: string): string[] {
  switch (type) {
    case 'HOTEL':
    case 'MAISON_DHOTE':
      return ['room'];
    case 'EVENT_SPACE':
      return ['ticket_only'];
    case 'CINEMA':
      return ['seat'];
    case 'COWORKING':
      return ['room', 'table'];
    default:
      return ['table'];
  }
}

function CreateVenueModal({
  defaultType,
  onClose,
  onCreated,
}: {
  defaultType: string;
  onClose: () => void;
  onCreated: (id: string, type: string) => void;
}) {
  const [type, setType] = useState<string>(defaultType || 'HOTEL');
  // When the list is already filtered to a category (e.g. /admin/venues?type=MAISON_DHOTE),
  // lock the new establishment to that category instead of offering every type.
  const lockedType = Boolean(defaultType);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [stars, setStars] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const showStars = type === 'HOTEL' || type === 'MAISON_DHOTE';

  const typeOptions: { value: string; label: string }[] = [
    { value: 'HOTEL', label: 'Hôtel' },
    { value: 'MAISON_DHOTE', label: "Maison d'hôte" },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'CAFE', label: 'Café' },
    { value: 'CAFE_LOUNGE', label: 'Café & Lounge' },
    { value: 'COWORKING', label: 'Coworking' },
    { value: 'CINEMA', label: 'Cinéma' },
    { value: 'EVENT_SPACE', label: 'Salle d\'événements' },
    { value: 'BAR', label: 'Bar' },
    { value: 'ROOFTOP', label: 'Rooftop' },
    { value: 'BEACH_CLUB', label: 'Beach Club' },
    { value: 'CLUB', label: 'Club' },
    { value: 'LOUNGE', label: 'Lounge' },
    { value: 'SPA', label: 'Spa & Bien-être' },
  ];

  async function handleCreate() {
    if (!name.trim() || !city.trim() || !address.trim()) {
      toast.error('Nom, ville et adresse sont requis.');
      return;
    }
    setSaving(true);
    try {
      const label = VENUE_TYPE_LABELS[type] ?? type;
      const res = await createAdminVenue({
        name: name.trim(),
        type,
        city: city.trim(),
        address: address.trim(),
        description: `${label} ${name.trim()} situé à ${city.trim()}.`,
        isPublished: false,
        reservationModes: reservationModesFor(type) as any,
        ...(showStars && stars ? { stars } : {}),
      } as any);
      const id = (res as any)._id ?? (res as any).data?._id;
      if (!id) throw new Error('ID manquant');
      onCreated(id, type);
    } catch {
      toast.error("Erreur lors de la création de l'établissement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Nouvel établissement</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Vous pourrez compléter tous les détails ensuite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Catégorie *</label>
            {lockedType ? (
              <div className="flex h-10 w-full items-center rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 text-sm font-medium text-zinc-200">
                {typeOptions.find((opt) => opt.value === type)?.label ?? VENUE_TYPE_LABELS[type] ?? type}
              </div>
            ) : (
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 focus:outline-none"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nom *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Riad Azura"
              className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Ville *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none"
            >
              <option value="">Sélectionner une ville</option>
              {TUNISIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Adresse *</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: 12 rue des Bougainvilliers"
              className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
            />
          </div>

          {showStars && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Classement officiel
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: null as number | null, label: 'Aucun' },
                  { value: 1, label: '1★' },
                  { value: 2, label: '2★' },
                  { value: 3, label: '3★' },
                  { value: 4, label: '4★' },
                  { value: 5, label: '5★' },
                ].map((opt) => {
                  const active = stars === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setStars(opt.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
                        active
                          ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-500">
                Hôtels et maisons d&apos;hôte : utilisé pour le badge étoiles visible côté client.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl border-zinc-700 text-zinc-400"
          >
            Annuler
          </Button>
          <Button
            disabled={saving}
            onClick={handleCreate}
            className="flex-1 rounded-xl bg-[#D4AF37] font-semibold text-black hover:bg-[#c9a227]"
          >
            {saving ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
