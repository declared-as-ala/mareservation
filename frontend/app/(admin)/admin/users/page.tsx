'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser,
} from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Pencil, Trash2, Search, ShieldCheck, User2, Crown } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['USER', 'ADMIN', 'VENUE_OWNER', 'ORGANIZER'] as const;

function RoleBadge({ role }: { role?: string }) {
  if (!role) return <span className="text-zinc-500">—</span>;
  const map: Record<string, { label: string; className: string }> = {
    ADMIN: { label: 'Admin', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    VENUE_OWNER: { label: 'Propriétaire', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    ORGANIZER: { label: 'Organisateur', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
    USER: { label: 'Utilisateur', className: 'bg-zinc-800 text-zinc-400 border border-zinc-700' },
  };
  const config = map[role] ?? { label: role, className: 'bg-zinc-800 text-zinc-400 border border-zinc-700' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${config.className}`}>
      {role === 'ADMIN' && <ShieldCheck className="size-3" />}
      {role === 'VENUE_OWNER' && <Crown className="size-3" />}
      {role === 'USER' && <User2 className="size-3" />}
      {config.label}
    </span>
  );
}

function getInitials(user: AdminUser) {
  const name = user.fullName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getDisplayName(user: AdminUser) {
  return user.fullName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—';
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState('USER');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const { data: rawUsers = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchAdminUsers(),
  });

  const users = rawUsers as AdminUser[];

  const updateMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      updateAdminUser(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Rôle mis à jour');
      setEditTarget(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Utilisateur supprimé');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      getDisplayName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Role counts
  const counts = users.reduce((acc, u) => {
    acc[u.role ?? 'USER'] = (acc[u.role ?? 'USER'] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {users.length} utilisateur{users.length !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* Stats pills */}
      {!isLoading && users.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([role, count]) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all duration-200 cursor-pointer ${
                roleFilter === role
                  ? 'bg-matable-primary/10 text-matable-primary border-matable-primary/30 shadow-sm shadow-matable-primary/10'
                  : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <RoleBadge role={role} />
              <span className="tabular-nums font-semibold">{count}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all duration-200 cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-matable-primary/10 text-matable-primary border-matable-primary/30 shadow-sm shadow-matable-primary/10'
                : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            Tous
            <span className="tabular-nums font-semibold">{users.length}</span>
          </button>
        </div>
      )}

      {/* Table Card */}
      <Card className="border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              <Users className="size-4 text-matable-primary" />
              Liste des utilisateurs
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm w-[220px] border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-matable-primary focus:ring-matable-primary/20 transition-all duration-200"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 text-sm w-[150px] border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-matable-primary focus:ring-matable-primary/20 transition-all duration-200">
                  <SelectValue placeholder="Tous les rôles" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                <TableHead className="pl-4 text-zinc-400">Utilisateur</TableHead>
                <TableHead className="text-zinc-400">Email</TableHead>
                <TableHead className="text-zinc-400">Rôle</TableHead>
                <TableHead className="text-zinc-400">Inscription</TableHead>
                <TableHead className="text-right pr-4 text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-zinc-800" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={5} className="h-40">
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <Users className="size-8" />
                      <p className="text-sm font-medium">
                        {search || roleFilter !== 'all' ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
                      </p>
                      <p className="text-xs">
                        {search || roleFilter !== 'all' 
                          ? 'Essayez de modifier vos filtres' 
                          : 'Les utilisateurs apparaîtront ici'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow 
                    key={u._id} 
                    className="border-zinc-800 hover:bg-matable-primary/5 transition-all duration-200 cursor-pointer group"
                    title={`Voir les détails de ${getDisplayName(u)}`}
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0 group-hover:scale-105 transition-transform duration-200">
                          {getInitials(u)}
                        </div>
                        <span className="font-medium text-sm text-zinc-100 group-hover:text-matable-cta transition-colors duration-200">{getDisplayName(u)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">{u.email}</TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell className="text-sm text-zinc-500 tabular-nums">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-zinc-400 hover:text-matable-primary hover:bg-matable-primary/10 transition-all duration-200 cursor-pointer"
                          onClick={() => {
                            setEditTarget(u);
                            setEditRole(u.role ?? 'USER');
                          }}
                          aria-label="Modifier"
                          title="Modifier le rôle"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                          onClick={() => setDeleteTarget(u)}
                          aria-label="Supprimer"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o: boolean) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de <span className="font-medium text-zinc-200">{editTarget ? getDisplayName(editTarget) : ''}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
              <div className="size-10 rounded-full bg-gradient-to-br from-matable-primary/20 to-matable-primary/40 border border-matable-primary/30 flex items-center justify-center text-sm font-bold text-matable-primary">
                {editTarget ? getInitials(editTarget) : ''}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">{editTarget ? getDisplayName(editTarget) : ''}</p>
                <p className="text-xs text-zinc-500">{editTarget?.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Rôle</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-matable-primary focus:ring-matable-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer">
              Annuler
            </Button>
            <Button
              onClick={() => editTarget && updateMut.mutate({ id: editTarget._id, role: editRole })}
              disabled={updateMut.isPending}
              className="bg-matable-primary text-white hover:bg-matable-primary-light cursor-pointer"
            >
              {updateMut.isPending ? 'Enregistrement...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer l&apos;utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              L&apos;utilisateur <strong className="text-zinc-200">{deleteTarget ? getDisplayName(deleteTarget) : ''}</strong> ({deleteTarget?.email}) sera
              définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-400 text-white"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget._id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
