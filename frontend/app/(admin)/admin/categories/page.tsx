'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  type AdminCategory,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, FolderTree, Search } from 'lucide-react';
import { toast } from 'sonner';

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type FormState = {
  name: string;
  slug: string;
  type: string;
  displayOrder: string;
  icon: string;
  description: string;
};

const emptyForm: FormState = { name: '', slug: '', type: '', displayOrder: '', icon: '', description: '' };

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [search, setSearch] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchAdminCategories,
  });

  const createMut = useMutation({
    mutationFn: (f: FormState) =>
      createAdminCategory({
        name: f.name.trim(),
        slug: f.slug.trim() || slugify(f.name),
        type: f.type.trim() || undefined,
        displayOrder: f.displayOrder ? Number(f.displayOrder) : undefined,
        icon: f.icon.trim() || undefined,
        description: f.description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('Catégorie créée');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, f }: { id: string; f: FormState }) =>
      updateAdminCategory(id, {
        name: f.name.trim(),
        slug: f.slug.trim() || slugify(f.name),
        type: f.type.trim() || undefined,
        displayOrder: f.displayOrder ? Number(f.displayOrder) : undefined,
        icon: f.icon.trim() || undefined,
        description: f.description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('Catégorie mise à jour');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('Catégorie supprimée');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(cat: AdminCategory) {
    setEditTarget(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      type: cat.type ?? '',
      displayOrder: cat.displayOrder != null ? String(cat.displayOrder) : '',
      icon: cat.icon ?? '',
      description: cat.description ?? '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editTarget) {
      updateMut.mutate({ id: editTarget._id, f: form });
    } else {
      createMut.mutate(form);
    }
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Catégories</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {categories.length} catégorie{categories.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Button 
          onClick={openCreate} 
          className="gap-2 bg-amber-500 text-black hover:bg-amber-400 transition-all duration-200"
        >
          <Plus className="size-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {/* Table Card */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              <FolderTree className="size-4 text-amber-400" />
              Liste des catégories
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                placeholder="Rechercher une catégorie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm w-[220px] border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                <TableHead className="text-zinc-400">Nom</TableHead>
                <TableHead className="text-zinc-400">Slug</TableHead>
                <TableHead className="text-zinc-400">Type</TableHead>
                <TableHead className="text-zinc-400">Ordre</TableHead>
                <TableHead className="text-right pr-4 text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full bg-zinc-800" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={5} className="h-40">
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <FolderTree className="size-8" />
                      <p className="text-sm font-medium">
                        {search ? 'Aucune catégorie trouvée' : 'Aucune catégorie'}
                      </p>
                      <p className="text-xs">
                        {search ? 'Essayez de modifier votre recherche' : 'Créez-en une avec le bouton ci-dessus'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((cat) => (
                  <TableRow key={cat._id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors duration-150">
                    <TableCell className="font-medium text-zinc-100">
                      <div className="flex items-center gap-2">
                        {cat.icon && (
                          <span className="size-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base">
                            {cat.icon}
                          </span>
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-zinc-400 font-mono">{cat.slug}</code>
                    </TableCell>
                    <TableCell>
                      {cat.type ? (
                        <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                          {cat.type}
                        </Badge>
                      ) : (
                        <span className="text-zinc-500 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-zinc-400">
                        {cat.displayOrder ?? <span className="text-zinc-500">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                          onClick={() => openEdit(cat)}
                          aria-label="Modifier"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                          onClick={() => setDeleteTarget(cat)}
                          aria-label="Supprimer"
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editTarget ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editTarget 
                ? 'Modifiez les informations de cette catégorie'
                : 'Remplissez les informations pour créer une nouvelle catégorie'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-zinc-300">Nom *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editTarget ? f.slug : slugify(name),
                  }));
                }}
                placeholder="Ex: Restaurants"
                required
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug" className="text-zinc-300">Slug *</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="Ex: restaurants"
                required
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cat-type" className="text-zinc-300">Type</Label>
                <Input
                  id="cat-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  placeholder="Ex: RESTAURANT"
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-order" className="text-zinc-300">Ordre d&apos;affichage</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon" className="text-zinc-300">Icône (emoji)</Label>
              <Input
                id="cat-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="Ex: 🍽️"
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc" className="text-zinc-300">Description</Label>
              <Input
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description courte"
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || !form.name.trim()}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                {isSaving ? 'Enregistrement...' : editTarget ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              La catégorie <strong className="text-zinc-200">{deleteTarget?.name}</strong> sera définitivement supprimée.
              Cette action est irréversible.
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
