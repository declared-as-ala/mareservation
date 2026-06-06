'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { fetchScenes } from '@/lib/api/scenes';
import {
  updateAdminVenue,
  createAdminVenueScene,
  deleteAdminVenueScene,
  fetchAdminOwners,
  assignVenueOwner,
  fetchAdminVenueTables,
  createAdminTable,
  updateAdminTable,
  deleteAdminTable,
  fetchAdminTablePlacements,
  createAdminTablePlacement,
  updateAdminTablePlacement,
  deleteAdminTablePlacement,
  fetchAdminVenueScenes,
  fetchAdminReservableUnits,
  createAdminSceneHotspot,
  deleteAdminSceneHotspot,
  fetchAdminHotelRooms,
  createAdminHotelRoom,
  updateAdminHotelRoom,
  deleteAdminHotelRoom,
  type AdminTableRow,
  type AdminTablePlacement,
  type AdminHotelRoom,
  fetchAdminReservations,
} from '@/lib/api/admin';
import { uploadImageFile } from '@/lib/api/client';
import { fetchAdminVenueMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/api/menu';
import type { MenuItem, MenuCategory } from '@/lib/api/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  ArrowLeft, Save, Upload, Loader2, Map,
  Plus, Trash2, CheckCircle2, MousePointer2,
  MapPin, Move, X, Star, Users, BadgeCheck,
  ImageIcon, Info, Eye, LayoutGrid, Globe2,
  Phone, Hash, FileText, Building2, Camera,
  Sparkles, ImagePlus, UtensilsCrossed, ScanLine,
  BedDouble, Crown, DollarSign, Bath,
  Film, CalendarDays, BookOpen, Clapperboard, PartyPopper, Clock3, CheckCircle, AlertCircle,
} from 'lucide-react';
import { VENUE_TYPE_LABELS } from '@/app/constants/venueTypes';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Panorama360Editor, type Panorama360EditorApis } from '@/components/dashboard/Panorama360Editor';
import { deleteOwnerTableBlock, fetchOwnerTableBlocks } from '@/lib/api/owner-table';
import { deleteOwnerCoworkingBlock, fetchOwnerCoworkingBlocks } from '@/lib/api/owner-coworking';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

const VirtualTourBuilder = dynamic(
  () => import('@/components/admin/hotel/VirtualTourBuilder').then((m) => ({ default: m.VirtualTourBuilder })),
  { ssr: false }
);

const RoomEditorModal = dynamic(
  () => import('@/components/admin/hotel/RoomEditorModal').then((m) => ({ default: m.RoomEditorModal })),
  { ssr: false }
);

const RoomTourModal = dynamic(
  () => import('@/components/admin/hotel/RoomTourModal').then((m) => ({ default: m.RoomTourModal })),
  { ssr: false }
);

const TYPE_OPTIONS = Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

type ImmersiveType = 'none' | 'virtual-tour' | 'view-360';
type ImmersiveSourceType = 'url' | 'upload';

type VenueForm = {
  name: string; type: string; city: string; address: string;
  description: string; shortDescription: string; coverImage: string;
  gallery: string[]; isPublished: boolean; isFeatured: boolean;
  isVedette: boolean; phone: string; slug: string;
  immersiveType: ImmersiveType; immersiveSourceType: ImmersiveSourceType | '';
  immersiveUrl: string; immersiveFile: string;
  reservationFeeType: 'percentage' | 'fixed' | '';
  reservationFeeValue: string;
};

function toForm(venue: Record<string, unknown>): VenueForm {
  return {
    name: String(venue.name ?? ''),
    type: String(venue.type ?? 'CAFE'),
    city: String(venue.city ?? ''),
    address: String(venue.address ?? ''),
    description: String(venue.description ?? ''),
    shortDescription: String(venue.shortDescription ?? ''),
    coverImage: String(venue.coverImage ?? ''),
    gallery: Array.isArray(venue.gallery) ? venue.gallery as string[] : [],
    isPublished: Boolean(venue.isPublished !== false),
    isFeatured: Boolean(venue.isFeatured),
    isVedette: Boolean(venue.isVedette),
    phone: String(venue.phone ?? ''),
    slug: String(venue.slug ?? ''),
    immersiveType: (['none', 'virtual-tour', 'view-360'].includes(venue.immersiveType as string)
      ? venue.immersiveType as ImmersiveType : 'none'),
    immersiveSourceType: (['url', 'upload'].includes(venue.immersiveSourceType as string)
      ? venue.immersiveSourceType as ImmersiveSourceType : ''),
    immersiveUrl: String(venue.immersiveUrl ?? ''),
    immersiveFile: String(venue.immersiveFile ?? ''),
    reservationFeeType: (['percentage', 'fixed'].includes(venue.reservationFeeType as string)
      ? venue.reservationFeeType as 'percentage' | 'fixed' : ''),
    reservationFeeValue: venue.reservationFeeValue != null ? String(venue.reservationFeeValue) : '',
  };
}

type EditorMode =
  | { type: 'idle' }
  | { type: 'placing'; tableId: string; tableName: string }
  | { type: 'moving'; placementId: string; tableId: string; tableName: string };

/* ── Drag & Drop Upload Zone ────────────────────────────────────────── */
function DropZone({ onFile, uploading, accept, label, sublabel }: {
  onFile: (f: File) => void; uploading: boolean; accept: string;
  label: string; sublabel: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-300',
        dragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30',
        uploading && 'pointer-events-none opacity-60'
      )}
    >
      <input
        ref={inputRef} type="file" accept={accept}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        className="hidden"
      />
      <div className={cn(
        'size-14 rounded-2xl flex items-center justify-center transition-colors',
        dragOver ? 'bg-primary/10' : 'bg-muted'
      )}>
        {uploading
          ? <Loader2 className="size-6 animate-spin text-primary" />
          : <Upload className="size-6 text-muted-foreground" />
        }
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{uploading ? 'Upload en cours...' : label}</p>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </div>
    </div>
  );
}

export default function AdminVenueDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VenueForm | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Placement editor state
  const [editorMode, setEditorMode] = useState<EditorMode>({ type: 'idle' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTable, setNewTable] = useState({
    tableNumber: '', name: '', capacity: '4', isVip: false, price: '', locationLabel: '',
  });
  const [creating, setCreating] = useState(false);

  // Menu state
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: 'plat' as MenuCategory,
    isAvailable: true, isPopular: false,
  });
  const [menuCreating, setMenuCreating] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // Queries
  const { data: venue, isLoading, error, refetch } = useQuery({
    queryKey: ['venue', id],
    queryFn: () => fetchVenueByIdOrSlug(id),
    enabled: !!id,
  });

  const { data: tables = [], refetch: refetchTables } = useQuery({
    queryKey: ['admin-tables', id],
    queryFn: () => fetchAdminVenueTables(id),
    enabled: !!id,
  });

  const { data: placements = [], refetch: refetchPlacements } = useQuery({
    queryKey: ['admin-placements', id],
    queryFn: () => fetchAdminTablePlacements(id),
    enabled: !!id,
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ['admin-scenes', id],
    queryFn: () => fetchScenes(id),
    enabled: !!id,
  });

  const { data: menuItems = [], refetch: refetchMenu } = useQuery({
    queryKey: ['admin-menu', id],
    queryFn: () => fetchAdminVenueMenu(id),
    enabled: !!id,
  });

  const { data: tourData, refetch: refetchTour } = useQuery({
    queryKey: ['admin-venue-tour', id],
    queryFn: () => fetchAdminVenueScenes(id),
    enabled: !!id,
  });
  const { data: adminReservations = [] } = useQuery({
    queryKey: ['admin-reservations-for-venue', id],
    queryFn: () => fetchAdminReservations(),
    enabled: !!id,
  });

  const venueType = form?.type || (venue as any)?.type || '';
  const isHotel = venueType === 'HOTEL';
  const isRestaurantOrCafe = venueType === 'RESTAURANT' || venueType === 'CAFE';
  const isCoworking = venueType === 'COWORKING';
  const isCinema = venueType === 'CINEMA';
  const isEventSpace = venueType === 'EVENT_SPACE';
  const showTables = isRestaurantOrCafe;
  const showMenu = isRestaurantOrCafe;
  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['admin-hotel-rooms', id],
    queryFn: () => fetchAdminHotelRooms(id),
    enabled: !!id && isHotel,
  });
  const [editingRoom, setEditingRoom] = useState<AdminHotelRoom | null>(null);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [tourRoom, setTourRoom] = useState<AdminHotelRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<AdminHotelRoom | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  async function handleDeleteRoom() {
    if (!deletingRoom) return;
    setIsDeletingRoom(true);
    try {
      await deleteAdminHotelRoom(deletingRoom._id);
      await refetchRooms();
      toast.success(`${deletingRoom.name ?? `Chambre ${deletingRoom.roomNumber}`} supprimée.`);
      setDeletingRoom(null);
    } catch (err) {
      toast.error('Suppression échouée', {
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
      });
    } finally {
      setIsDeletingRoom(false);
    }
  }

  const { data: owners = [] } = useQuery({
    queryKey: ['admin-owners'],
    queryFn: fetchAdminOwners,
  });
  const [ownerAssigning, setOwnerAssigning] = useState(false);

  const effectiveSceneId = activeSceneId ?? (scenes[0]?._id ?? null);

  const tablePlacementApis: Panorama360EditorApis = {
    fetchScenes: async (venueId) => {
      const data = await fetchAdminVenueScenes(venueId);
      return data.scenes.map((scene) => ({ _id: scene._id, name: scene.name, image: scene.image }));
    },
    createScene: (venueId, payload) =>
      createAdminVenueScene(venueId, { name: payload.name, image: payload.image, description: payload.description }),
    deleteScene: (_venueId, sceneId) => deleteAdminVenueScene(sceneId),
    fetchHotspots: async (venueId) => {
      const data = await fetchAdminVenueScenes(venueId);
      return data.hotspots;
    },
    createHotspot: (venueId, payload) => createAdminSceneHotspot({ venueId, ...payload }),
    deleteHotspot: (_venueId, hotspotId) => deleteAdminSceneHotspot(hotspotId),
    fetchPlacements: (venueId) => fetchAdminTablePlacements(venueId),
    createPlacement: (venueId, payload) =>
      createAdminTablePlacement({
        venueId,
        sceneId: payload.sceneId,
        yaw: payload.yaw,
        pitch: payload.pitch,
        tableId: payload.tableId,
      }),
    updatePlacement: (_venueId, placementId, payload) => updateAdminTablePlacement(placementId, payload),
    deletePlacement: (_venueId, placementId) => deleteAdminTablePlacement(placementId),
    fetchTables: (venueId) => fetchAdminVenueTables(venueId),
    createTable: (venueId, payload) =>
      createAdminTable({
        venueId,
        tableNumber: Math.max(0, ...tables.map((table) => Number(table.tableNumber || 0))) + 1,
        name: payload.name,
        capacity: payload.capacity,
        capacityMax: payload.capacity,
        price: payload.price,
        minimumSpend: payload.minimumSpend,
        isVip: payload.isVip,
        defaultStatus: 'available',
      }),
    updateTable: (_venueId, tableId, payload) => updateAdminTable(tableId, payload),
    deleteTable: (_venueId, tableId) => deleteAdminTable(tableId),
    fetchBlocks: fetchOwnerTableBlocks,
    deleteBlock: deleteOwnerTableBlock,
  };

  const unitPlacementApis: Panorama360EditorApis = {
    fetchScenes: async (venueId) => {
      const data = await fetchAdminVenueScenes(venueId);
      return data.scenes.map((scene) => ({ _id: scene._id, name: scene.name, image: scene.image }));
    },
    createScene: (venueId, payload) =>
      createAdminVenueScene(venueId, { name: payload.name, image: payload.image, description: payload.description }),
    deleteScene: (_venueId, sceneId) => deleteAdminVenueScene(sceneId),
    fetchHotspots: async (venueId) => {
      const data = await fetchAdminVenueScenes(venueId);
      return data.hotspots;
    },
    createHotspot: (venueId, payload) => createAdminSceneHotspot({ venueId, ...payload }),
    deleteHotspot: (_venueId, hotspotId) => deleteAdminSceneHotspot(hotspotId),
    fetchPlacements: (venueId) => fetchAdminTablePlacements(venueId),
    createPlacement: (venueId, payload) =>
      createAdminTablePlacement({
        venueId,
        sceneId: payload.sceneId,
        yaw: payload.yaw,
        pitch: payload.pitch,
        reservableUnitId: payload.reservableUnitId,
      }),
    updatePlacement: (_venueId, placementId, payload) => updateAdminTablePlacement(placementId, payload),
    deletePlacement: (_venueId, placementId) => deleteAdminTablePlacement(placementId),
    fetchUnits: (venueId) => fetchAdminReservableUnits(venueId),
    fetchBlocks: fetchOwnerCoworkingBlocks,
    deleteBlock: deleteOwnerCoworkingBlock,
  };

  useEffect(() => {
    if (venue && typeof venue === 'object') setForm(toForm(venue as unknown as Record<string, unknown>));
  }, [venue]);

  const updateMutation = useMutation({
    mutationFn: (payload: VenueForm) => {
      const body = {
        ...payload,
        immersiveSourceType: payload.immersiveSourceType || null,
        immersiveProvider: 'custom' as const,
        immersiveUrl: payload.immersiveUrl || null,
        immersiveFile: payload.immersiveFile || null,
        reservationFeeType: payload.reservationFeeType || null,
        reservationFeeValue: payload.reservationFeeValue ? parseFloat(payload.reservationFeeValue) : null,
      };
      return updateAdminVenue(id, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
      toast.success('Lieu mis à jour avec succès.');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la mise à jour.'),
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (form) updateMutation.mutate(form); };

  const persistImmersiveUpload = async (url: string, requestedType?: ImmersiveType) => {
    const immersiveType = requestedType && requestedType !== 'none' ? requestedType : 'view-360';
    await updateAdminVenue(id, {
      immersiveType,
      immersiveSourceType: 'upload',
      immersiveProvider: 'custom',
      immersiveUrl: null,
      immersiveFile: url,
    });
    setForm((prev) => prev ? {
      ...prev,
      immersiveType,
      immersiveSourceType: 'upload',
      immersiveUrl: '',
      immersiveFile: url,
    } : prev);
    queryClient.invalidateQueries({ queryKey: ['venue', id] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
  };

  // ── Cover image upload ──
  const handleCoverUpload = async (file: File) => {
    if (!form) return;
    setCoverUploading(true);
    try {
      const url = await uploadImageFile(file);
      setForm({ ...form, coverImage: url });
      toast.success('Image de couverture uploadée.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally { setCoverUploading(false); }
  };

  // ── Gallery upload ──
  const handleGalleryUpload = async (file: File) => {
    if (!form) return;
    setGalleryUploading(true);
    try {
      const url = await uploadImageFile(file);
      setForm({ ...form, gallery: [...form.gallery, url] });
      toast.success('Image ajoutée à la galerie.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally { setGalleryUploading(false); }
  };

  const removeGalleryUrl = (i: number) => {
    if (form) setForm({ ...form, gallery: form.gallery.filter((_, idx) => idx !== i) });
  };

  const handleUnifiedTourUpload = async (files: FileList | null) => {
    if (!files || !form) return;
    const list = Array.from(files).slice(0, 10);
    if (!list.length) return;
    setUploading(true);
    try {
      let primaryConsumed = !!form.immersiveFile;
      for (const [idx, file] of list.entries()) {
        const url = await uploadImageFile(file);
        if (!primaryConsumed) {
          await persistImmersiveUpload(url, 'view-360');
          primaryConsumed = true;
        } else {
          await createAdminVenueScene(id, {
            name: `Snapshot ${Date.now()}-${idx + 1}`,
            image: url,
          });
        }
      }
      await refetchTour();
      toast.success('Espace 360° mis à jour.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload 360°.");
    } finally {
      setUploading(false);
    }
  };

  // ── Immersive file upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      await persistImmersiveUpload(url, form.immersiveType);
      toast.success('Fichier uploadé avec succès.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally { setUploading(false); }
  };

  const handleImmersiveDropUpload = async (file: File) => {
    if (!form) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      await persistImmersiveUpload(url, form.immersiveType);
      toast.success('Fichier immersif uploadé.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally { setUploading(false); }
  };

  // ── Placement helpers ──
  const getPlacement = (tableId: string) =>
    placements.find((p) => p.tableId === tableId) ?? null;

  const tableName = (t: AdminTableRow) =>
    t.name ? `${t.name} (T${t.tableNumber})` : `Table ${t.tableNumber}`;

  const handlePlaceClick = (t: AdminTableRow) => {
    setEditorMode({ type: 'placing', tableId: t._id, tableName: tableName(t) });
  };

  const handleMoveClick = (t: AdminTableRow, p: AdminTablePlacement) => {
    setEditorMode({ type: 'moving', placementId: p._id, tableId: t._id, tableName: tableName(t) });
  };

  const handlePanoramaClick = async (yaw: number, pitch: number) => {
    if (editorMode.type === 'placing') {
      setActionLoading(editorMode.tableId);
      try {
        await createAdminTablePlacement({
          venueId: id,
          tableId: editorMode.tableId,
          sceneId: effectiveSceneId ?? 'default',
          positionType: 'yaw_pitch',
          yaw,
          pitch,
        });
        await refetchPlacements();
        toast.success(`Position enregistrée pour ${editorMode.tableName}.`);
      } catch {
        toast.error('Erreur lors du placement.');
      } finally {
        setActionLoading(null);
        setEditorMode({ type: 'idle' });
      }
    }
  };

  const handleMarkerMoved = async (placementId: string, yaw: number, pitch: number) => {
    setActionLoading(placementId);
    try {
      await updateAdminTablePlacement(placementId, { yaw, pitch });
      await refetchPlacements();
      if (editorMode.type === 'moving') {
        toast.success(`Position mise à jour pour ${editorMode.tableName}.`);
      }
    } catch {
      toast.error('Erreur lors du repositionnement.');
    } finally {
      setActionLoading(null);
      setEditorMode({ type: 'idle' });
    }
  };

  const handleRemovePlacement = async (t: AdminTableRow, p: AdminTablePlacement) => {
    setActionLoading(t._id);
    try {
      await deleteAdminTablePlacement(p._id);
      await refetchPlacements();
      if (editorMode.type !== 'idle' && (editorMode as { tableId?: string }).tableId === t._id) {
        setEditorMode({ type: 'idle' });
      }
      toast.success(`Placement de ${tableName(t)} retiré.`);
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTable = async (t: AdminTableRow) => {
    const p = getPlacement(t._id);
    setActionLoading(t._id);
    try {
      if (p) await deleteAdminTablePlacement(p._id);
      await deleteAdminTable(t._id);
      await Promise.all([refetchTables(), refetchPlacements()]);
      toast.success(`Table ${t.tableNumber} supprimée.`);
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTable = async () => {
    const num = parseInt(newTable.tableNumber, 10);
    if (!num || num < 1) { toast.error('Numéro de table invalide.'); return; }
    setCreating(true);
    try {
      await createAdminTable({
        venueId: id,
        tableNumber: num,
        name: newTable.name.trim() || undefined,
        capacity: parseInt(newTable.capacity, 10) || 4,
        price: parseFloat(newTable.price) || 0,
        locationLabel: newTable.locationLabel.trim() || undefined,
        isVip: newTable.isVip,
        defaultStatus: 'available',
        isActive: true,
      });
      await refetchTables();
      setNewTable({ tableNumber: '', name: '', capacity: '4', isVip: false, price: '', locationLabel: '' });
      setShowCreateForm(false);
      toast.success('Table créée.');
    } catch {
      toast.error('Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  // ── Menu handlers ──
  const handleCreateMenuItem = async () => {
    const priceNum = parseFloat(menuForm.price);
    if (!menuForm.name.trim()) { toast.error('Le nom est requis.'); return; }
    if (isNaN(priceNum) || priceNum < 0) { toast.error('Prix invalide.'); return; }
    setMenuCreating(true);
    try {
      await createMenuItem({
        venueId: id,
        name: menuForm.name.trim(),
        description: menuForm.description.trim() || undefined,
        price: priceNum,
        category: menuForm.category,
        isAvailable: menuForm.isAvailable,
        isPopular: menuForm.isPopular,
      });
      await refetchMenu();
      setMenuForm({ name: '', description: '', price: '', category: 'plat', isAvailable: true, isPopular: false });
      toast.success('Article créé.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setMenuCreating(false);
    }
  };

  const handleToggleMenuItemAvailability = async (item: MenuItem) => {
    try {
      await updateMenuItem(item._id, { isAvailable: !item.isAvailable });
      await refetchMenu();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      await deleteMenuItem(itemId);
      await refetchMenu();
      toast.success('Article supprimé.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  const handleSaveEditMenuItem = async () => {
    if (!editingMenuItem) return;
    try {
      await updateMenuItem(editingMenuItem._id, {
        name: editingMenuItem.name,
        description: editingMenuItem.description,
        price: editingMenuItem.price,
        category: editingMenuItem.category,
        isAvailable: editingMenuItem.isAvailable,
        isPopular: editingMenuItem.isPopular,
      });
      await refetchMenu();
      setEditingMenuItem(null);
      toast.success('Article mis à jour.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  };

  const CATEGORY_LABELS: Record<MenuCategory, string> = {
    entree: 'Entrée', plat: 'Plat', dessert: 'Dessert', boisson: 'Boisson', autre: 'Autre',
  };

  const CATEGORY_COLORS: Record<MenuCategory, string> = {
    entree: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    plat: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    dessert: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
    boisson: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
    autre: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
  };

  // Build markers for PanoramaEngine
  const panoMarkers = placements
    .filter((p) => p.positionType === 'yaw_pitch' && p.yaw != null && p.pitch != null)
    .map((p) => {
      const t = tables.find((t) => t._id === p.tableId);
      return {
        placement: { ...p, createdAt: p.createdAt || '', updatedAt: p.updatedAt || '' },
        table: t ? {
          _id: t._id, venueId: t.venueId, tableNumber: t.tableNumber,
          name: t.name, capacity: t.capacity, locationLabel: t.locationLabel,
          price: t.price, minimumSpend: t.minimumSpend,
          defaultStatus: t.defaultStatus, isVip: t.isVip, isActive: t.isActive,
        } : undefined,
      };
    });

  const panoramaMode =
    editorMode.type === 'placing' ? 'place' :
    editorMode.type === 'moving'  ? 'move'  : 'navigate';

  const selectedMarkerId =
    editorMode.type === 'moving' ? editorMode.placementId : null;

  const hasPanorama = !!form?.immersiveFile &&
    form.immersiveSourceType === 'upload' &&
    !form.immersiveFile.match(/\.(mp4|webm|ogg)$/i);

  // ── Early returns ──
  if (!id) return (
    <div><p className="text-muted-foreground">ID manquant.</p>
      <Button asChild><Link href="/admin/venues">Retour</Link></Button></div>
  );
  if (isLoading) return <DetailPageSkeleton />;
  if (error || !venue) return (
    <div className="space-y-4">
      <ErrorState onRetry={() => refetch()} />
      <Button variant="outline" asChild><Link href="/admin/venues">Liste des lieux</Link></Button>
    </div>
  );
  if (!form) return <DetailPageSkeleton />;

  const showFileUpload = form.immersiveType !== 'none';
  const filteredVenueReservations = (adminReservations as any[]).filter((r) => {
    const rid = String((r as any)?.venueId?._id ?? (r as any)?.venueId ?? '');
    return rid === id;
  }).slice(0, 20);
  const reservationStats = {
    total: filteredVenueReservations.length,
    pending: filteredVenueReservations.filter((r) => ['pending', 'PENDING'].includes(String(r.status))).length,
    confirmed: filteredVenueReservations.filter((r) => ['confirmed', 'CONFIRMED', 'checked_in'].includes(String(r.status))).length,
  };
  const immersiveCount = (tourData?.scenes?.length ?? 0) + (form.immersiveFile ? 1 : 0);

  return (
    <div className="space-y-6 pb-10">
      {/* ── Premium Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="size-9 rounded-xl border border-border/50 hover:border-border">
            <Link href="/admin/venues"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
              <Link href="/admin/venues" className="hover:text-foreground transition-colors">Lieux</Link>
              <span>/</span>
              <span className="text-foreground font-medium">{form.name || 'Édition'}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">{form.name || 'Nouveau lieu'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {form.isPublished && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Publié
              </span>
            )}
            {form.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium px-2.5 py-1">
                <Star className="size-3" /> Vedette
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <Link href={`/lieu/${venue.slug || venue._id}`} target="_blank">
              <Eye className="size-3.5 mr-1.5" /> Aperçu
            </Link>
          </Button>
          <Button
            size="sm" className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
            onClick={() => { if (form) updateMutation.mutate(form); }}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Enregistrer
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/40 bg-background/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Type</p>
              <p className="text-sm font-semibold">{VENUE_TYPE_LABELS[form.type as keyof typeof VENUE_TYPE_LABELS] ?? form.type}</p>
            </div>
            <Building2 className="size-4 text-amber-400" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 bg-background/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Réservations</p>
              <p className="text-sm font-semibold">{reservationStats.total}</p>
            </div>
            <CalendarDays className="size-4 text-amber-400" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 bg-background/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">360° Assets</p>
              <p className="text-sm font-semibold">{immersiveCount}</p>
            </div>
            <ScanLine className="size-4 text-amber-400" />
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="info">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-zinc-900/70 backdrop-blur rounded-2xl p-1.5 border border-zinc-800/80">
            <TabsTrigger value="info" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
              <Info className="size-3.5" /> Informations
            </TabsTrigger>
            <TabsTrigger value="media" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
              <Camera className="size-3.5" /> Médias
            </TabsTrigger>

            {/* Hotel-only: Chambres & Suites */}
            {isHotel && (
              <TabsTrigger value="rooms" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
                <BedDouble className="size-3.5" /> Chambres & Suites
                {rooms.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                    {rooms.length}
                  </span>
                )}
              </TabsTrigger>
            )}

            {/* Restaurant/Café-only: Tables */}
            {showTables && (
              <TabsTrigger value="placements" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
                <LayoutGrid className="size-3.5" /> Tables
                {tables.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                    {tables.length}
                  </span>
                )}
              </TabsTrigger>
            )}

            {/* Restaurant/Café-only: Menu */}
            {showMenu && (
              <TabsTrigger value="menu" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
                <UtensilsCrossed className="size-3.5" /> Menu
              </TabsTrigger>
            )}

            {/* Cinema-only: Films & Séances */}
            {isCinema && (
              <TabsTrigger value="films" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
                <Clapperboard className="size-3.5" /> Films & Séances
              </TabsTrigger>
            )}

            {/* Event-only: Programme */}
            {isEventSpace && (
              <TabsTrigger value="programme" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
                <PartyPopper className="size-3.5" /> Programme
              </TabsTrigger>
            )}

            {/* All types: Visite virtuelle 360° */}
            <TabsTrigger value="tour360" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
              <ScanLine className="size-3.5" /> Visite virtuelle 360°
              {(tourData?.scenes?.length ?? 0) > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                  {tourData!.scenes.length}
                </span>
              )}
            </TabsTrigger>

            {/* All types: Réservations */}
            <TabsTrigger value="reservations" className="rounded-lg gap-1.5 data-[state=active]:shadow-md">
              <BookOpen className="size-3.5" /> Réservations
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Informations ─────────────────────────────── */}
          <TabsContent value="info" className="space-y-5 pt-5">
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Left: Identity */}
              <div className="lg:col-span-2 space-y-5">
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Identité du lieu</CardTitle>
                        <CardDescription className="text-xs">Informations principales visibles par les clients</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-xs font-medium flex items-center gap-1.5">
                        <FileText className="size-3 text-muted-foreground" /> Nom du lieu
                      </Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                        className="rounded-xl" placeholder="Ex: Café des Arts" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="type" className="text-xs font-medium">Type d&apos;établissement</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger id="type" className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TYPE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="slug" className="text-xs font-medium flex items-center gap-1.5">
                          <Hash className="size-3 text-muted-foreground" /> Slug (URL)
                        </Label>
                        <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          className="rounded-xl" placeholder="mon-lieu" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="city" className="text-xs font-medium flex items-center gap-1.5">
                          <Globe2 className="size-3 text-muted-foreground" /> Ville
                        </Label>
                        <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required
                          className="rounded-xl" placeholder="Tunis" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone" className="text-xs font-medium flex items-center gap-1.5">
                          <Phone className="size-3 text-muted-foreground" /> Téléphone
                        </Label>
                        <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="rounded-xl" placeholder="+216 XX XXX XXX" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address" className="text-xs font-medium flex items-center gap-1.5">
                        <MapPin className="size-3 text-muted-foreground" /> Adresse
                      </Label>
                      <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required
                        className="rounded-xl" placeholder="12 Rue de la Liberté" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="shortDescription" className="text-xs font-medium">Description courte</Label>
                      <Input id="shortDescription" value={form.shortDescription}
                        onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                        className="rounded-xl" placeholder="Une phrase d'accroche..." />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-xs font-medium">Description complète</Label>
                      <textarea
                        id="description" value={form.description} rows={4}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className={cn('flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background',
                          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none')}
                        placeholder="Décrivez l'ambiance, les spécialités, ce qui rend ce lieu unique..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Status & toggles */}
              <div className="space-y-5">
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-emerald-500" />
                      </div>
                      <CardTitle className="text-base">Statut & visibilité</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('size-8 rounded-lg flex items-center justify-center',
                          form.isPublished ? 'bg-emerald-500/15' : 'bg-muted')}>
                          <Eye className={cn('size-4', form.isPublished ? 'text-emerald-500' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Publié</p>
                          <p className="text-[11px] text-muted-foreground">Visible par les clients</p>
                        </div>
                      </div>
                      <Switch checked={form.isPublished}
                        onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('size-8 rounded-lg flex items-center justify-center',
                          form.isFeatured ? 'bg-amber-500/15' : 'bg-muted')}>
                          <Star className={cn('size-4', form.isFeatured ? 'text-amber-500' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">À la une</p>
                          <p className="text-[11px] text-muted-foreground">Affiché en vedette</p>
                        </div>
                      </div>
                      <Switch checked={form.isFeatured}
                        onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('size-8 rounded-lg flex items-center justify-center',
                          form.isVedette ? 'bg-amber-500/15' : 'bg-muted')}>
                          <Star className={cn('size-4', form.isVedette ? 'text-amber-500' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">En vedette</p>
                          <p className="text-[11px] text-muted-foreground">Affiché sur la page d&apos;accueil</p>
                        </div>
                      </div>
                      <Switch checked={form.isVedette}
                        onCheckedChange={(v) => setForm({ ...form, isVedette: v })} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Proprietaire du lieu</CardTitle>
                    <CardDescription className="text-xs">Assigner ou changer le proprietaire.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={typeof (venue as any).ownerId === 'object' ? ((venue as any).ownerId?._id || 'none') : ((venue as any).ownerId || 'none')}
                      onValueChange={async (value) => {
                        setOwnerAssigning(true);
                        try {
                          await assignVenueOwner(id, value === 'none' ? null : value);
                          await refetch();
                          toast.success('Proprietaire mis a jour.');
                        } catch {
                          toast.error('Erreur attribution proprietaire.');
                        } finally {
                          setOwnerAssigning(false);
                        }
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selectionner un proprietaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun proprietaire</SelectItem>
                        {owners.map((owner) => (
                          <SelectItem key={owner._id} value={owner._id}>
                            {owner.fullName || owner.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ownerAssigning ? <p className="text-xs text-zinc-500">Mise a jour...</p> : null}
                  </CardContent>
                </Card>

                {/* Reservation Fee */}
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <DollarSign className="size-4 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Frais de réservation</CardTitle>
                        <CardDescription className="text-xs">Appliqués automatiquement à chaque réservation</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-medium">Type de frais</Label>
                      <Select
                        value={form.reservationFeeType || 'none'}
                        onValueChange={(v) => setForm({ ...form, reservationFeeType: v === 'none' ? '' : v as 'percentage' | 'fixed' })}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Aucun frais" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun frais</SelectItem>
                          <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                          <SelectItem value="fixed">Montant fixe (TND)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.reservationFeeType && (
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium">
                          {form.reservationFeeType === 'percentage' ? 'Pourcentage (%)' : 'Montant (TND)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max={form.reservationFeeType === 'percentage' ? '100' : undefined}
                          step="0.01"
                          placeholder={form.reservationFeeType === 'percentage' ? 'Ex: 5' : 'Ex: 2.000'}
                          value={form.reservationFeeValue}
                          onChange={(e) => setForm({ ...form, reservationFeeValue: e.target.value })}
                          className="rounded-xl"
                        />
                        {form.reservationFeeValue && (
                          <p className="text-[11px] text-amber-500/80">
                            {form.reservationFeeType === 'percentage'
                              ? `${form.reservationFeeValue}% ajoutés au total de chaque réservation`
                              : `${parseFloat(form.reservationFeeValue).toLocaleString('fr-TN')} TND fixe par réservation`}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: Média & 360° ─────────────────────────────── */}
          <TabsContent value="media" className="space-y-5 pt-5">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Cover Image */}
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <ImageIcon className="size-4 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Image de couverture</CardTitle>
                      <CardDescription className="text-xs">Image principale affichée sur la carte du lieu</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.coverImage ? (
                    <div className="relative group rounded-xl overflow-hidden border bg-muted aspect-video">
                      <Image src={form.coverImage} alt="Couverture" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                          Utilisez la zone d'upload ci-dessous pour remplacer
                        </span>
                        <Button type="button" size="sm" variant="destructive" className="rounded-xl gap-1.5"
                          onClick={() => setForm({ ...form, coverImage: '' })}>
                          <Trash2 className="size-3.5" /> Retirer
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <DropZone
                    onFile={handleCoverUpload}
                    uploading={coverUploading}
                    accept="image/*"
                    label={form.coverImage ? 'Remplacer l\'image' : 'Glissez une image ici'}
                    sublabel="JPG, PNG, WebP • Max 5 MB"
                  />
                </CardContent>
              </Card>

              {/* Gallery */}
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <ImagePlus className="size-4 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Galerie photos</CardTitle>
                      <CardDescription className="text-xs">{form.gallery.length} image{form.gallery.length !== 1 ? 's' : ''} dans la galerie</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.gallery.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {form.gallery.map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border bg-muted aspect-square">
                          {url ? (
                            <Image src={url} alt={`Galerie ${i + 1}`} fill className="object-cover" sizes="150px" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <ImageIcon className="size-6 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button" onClick={() => removeGalleryUrl(i)}
                            className="absolute top-1.5 right-1.5 size-6 rounded-lg bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <DropZone
                    onFile={handleGalleryUpload}
                    uploading={galleryUploading}
                    accept="image/*"
                    label="Ajouter des photos"
                    sublabel="Glissez ou cliquez pour ajouter"
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="py-6">
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                  <ScanLine className="size-4 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Espace 360° unifié</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      La gestion immersive se fait uniquement dans l’onglet <strong className="text-zinc-200">Visite virtuelle 360°</strong>.
                      Un seul upload = vue 360°, plusieurs uploads = vue 360° avec snapshots/scènes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: Tables & Placement ─────────────────────────── */}
          <TabsContent value="placements" className="pt-5">
            <div className="flex gap-5" style={{ minHeight: 600 }}>

              {/* ── Left panel: table list ── */}
              <div className="w-72 shrink-0 flex flex-col gap-3">

                {!showCreateForm ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 px-4 py-3.5 text-sm font-medium text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
                  >
                    <Plus className="size-4" /> Nouvelle table
                  </button>
                ) : (
                  <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Nouvelle table</p>
                      <button type="button" onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">N° table *</Label>
                        <Input
                          type="number" min="1" placeholder="1"
                          value={newTable.tableNumber}
                          onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                          className="h-8 text-xs mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Capacité *</Label>
                        <Input
                          type="number" min="1" placeholder="4"
                          value={newTable.capacity}
                          onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                          className="h-8 text-xs mt-1 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Nom (optionnel)</Label>
                      <Input
                        placeholder="Ex: Table panoramique"
                        value={newTable.name}
                        onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                        className="h-8 text-xs mt-1 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Prix (TND)</Label>
                        <Input
                          type="number" min="0" placeholder="0"
                          value={newTable.price}
                          onChange={(e) => setNewTable({ ...newTable, price: e.target.value })}
                          className="h-8 text-xs mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Emplacement</Label>
                        <Input
                          placeholder="Terrasse..."
                          value={newTable.locationLabel}
                          onChange={(e) => setNewTable({ ...newTable, locationLabel: e.target.value })}
                          className="h-8 text-xs mt-1 rounded-lg"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input type="checkbox" checked={newTable.isVip}
                        onChange={(e) => setNewTable({ ...newTable, isVip: e.target.checked })}
                        className="rounded" />
                      Table VIP
                    </label>
                    <Button
                      type="button" size="sm" className="w-full gap-1 rounded-xl"
                      onClick={handleCreateTable} disabled={creating}
                    >
                      {creating ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                      Créer la table
                    </Button>
                  </div>
                )}

                {/* Table list */}
                <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 520 }}>
                  {tables.length === 0 && !showCreateForm && (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                      Aucune table. Créez-en une ci-dessus.
                    </div>
                  )}
                  {tables.map((t) => {
                    const placement = getPlacement(t._id);
                    const isActive = actionLoading === t._id ||
                      (editorMode.type !== 'idle' && (editorMode as { tableId?: string }).tableId === t._id);
                    const isEditing = editorMode.type !== 'idle' &&
                      (editorMode as { tableId?: string }).tableId === t._id;

                    return (
                      <div
                        key={t._id}
                        className={cn(
                          'rounded-2xl border p-3 transition-all',
                          isEditing
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : placement
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-border bg-card'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              'size-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                              t.isVip ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-foreground'
                            )}>
                              {t.tableNumber}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs font-semibold truncate">
                                  {t.name || `Table ${t.tableNumber}`}
                                </span>
                                {t.isVip && <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-0.5"><Users className="size-3" />{t.capacity}</span>
                                {t.price > 0 && <span>{t.price} TND</span>}
                                {t.locationLabel && <span className="truncate">{t.locationLabel}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTable(t)}
                            disabled={isActive}
                            className="text-muted-foreground hover:text-red-500 p-0.5 rounded transition-colors disabled:opacity-40 shrink-0"
                            title="Supprimer cette table"
                          >
                            {actionLoading === t._id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                          </button>
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                          {placement ? (
                            <>
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
                                <BadgeCheck className="size-3" />
                                Placé sur le panorama
                                <span className="text-muted-foreground font-normal ml-1">
                                  ({placement.yaw?.toFixed(2)}, {placement.pitch?.toFixed(2)})
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                {editorMode.type === 'moving' && editorMode.tableId === t._id ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditorMode({ type: 'idle' })}
                                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-1.5 animate-pulse"
                                  >
                                    <X className="size-3" /> Annuler
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveClick(t, placement)}
                                    disabled={isActive || (editorMode.type !== 'idle' && !isEditing)}
                                    className="flex-1 flex items-center justify-center gap-1 rounded-xl border text-[10px] font-medium px-2 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                                  >
                                    <Move className="size-3" /> Repositionner
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePlacement(t, placement)}
                                  disabled={isActive}
                                  className="flex items-center justify-center gap-1 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-medium px-2 py-1.5 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                >
                                  <X className="size-3" /> Retirer
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              {!hasPanorama ? (
                                <p className="text-[10px] text-muted-foreground italic">
                                  Configurez un panorama 360° uploadé pour placer cette table.
                                </p>
                              ) : editorMode.type === 'placing' && editorMode.tableId === t._id ? (
                                <button
                                  type="button"
                                  onClick={() => setEditorMode({ type: 'idle' })}
                                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-amber-500 text-black text-[10px] font-semibold px-2 py-1.5 animate-pulse"
                                >
                                  <X className="size-3" /> Annuler le placement
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePlaceClick(t)}
                                  disabled={editorMode.type !== 'idle'}
                                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-amber-500/20 text-amber-600 border border-amber-500/30 text-[10px] font-semibold px-2 py-1.5 hover:bg-amber-500/30 transition-colors disabled:opacity-40"
                                >
                                  <MapPin className="size-3" /> Placer sur panorama
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Right panel: panorama ── */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">

                {editorMode.type !== 'idle' && (
                  <div className={cn(
                    'flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium',
                    editorMode.type === 'placing'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600'
                      : 'bg-primary/10 border border-primary/30 text-primary'
                  )}>
                    {editorMode.type === 'placing'
                      ? <><MousePointer2 className="size-4 shrink-0" /> Cliquez sur le panorama pour placer <strong>{editorMode.tableName}</strong></>
                      : <><Move className="size-4 shrink-0" /> Cliquez sur le panorama pour repositionner <strong>{editorMode.tableName}</strong></>
                    }
                    <button type="button" onClick={() => setEditorMode({ type: 'idle' })} className="ml-auto">
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                {hasPanorama ? (
                  <div className="space-y-2">
                    {scenes.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-zinc-500 font-medium">Scène :</span>
                        {scenes.map((scene) => (
                          <button
                            key={scene._id}
                            type="button"
                            onClick={() => setActiveSceneId(scene._id)}
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                              effectiveSceneId === scene._id
                                ? 'bg-amber-400 border-amber-400 text-zinc-950'
                                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                            )}
                          >
                            {scene.name}
                          </button>
                        ))}
                        <Link href="/admin/scenes" className="text-xs text-zinc-500 hover:text-amber-400 underline ml-1">
                          + Gérer les scènes
                        </Link>
                      </div>
                    )}
                    <div className="relative flex-1 min-h-[400px] rounded-2xl overflow-hidden border bg-zinc-900">
                    <PanoramaEngine
                      imageUrl={
                        scenes.length > 0 && effectiveSceneId
                          ? (scenes.find((s) => s._id === effectiveSceneId)?.image ?? form.immersiveFile)
                          : form.immersiveFile
                      }
                      markers={panoMarkers}
                      selectedMarkerId={selectedMarkerId}
                      mode={panoramaMode}
                      scenes={scenes}
                      activeSceneId={effectiveSceneId}
                      onSceneChange={setActiveSceneId}
                      onPositionClick={handlePanoramaClick}
                      onMarkerMoved={handleMarkerMoved}
                    />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[400px] rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-3 text-center p-8">
                    <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Map className="size-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Aucun panorama 360° configuré</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        Allez dans l&apos;onglet <strong>Média & 360°</strong>, uploadez une image 360°, puis revenez ici pour placer vos tables.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const tab = document.querySelector('[data-state="inactive"][value="media"]') as HTMLElement | null;
                        tab?.click();
                      }}
                      className="text-xs text-primary font-medium underline underline-offset-2"
                    >
                      Aller à l&apos;onglet Média →
                    </button>
                  </div>
                )}

                {hasPanorama && tables.length > 0 && (
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded-full bg-emerald-500 inline-block" /> Placé
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded-full bg-amber-400 inline-block" /> VIP
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded-full bg-zinc-500 inline-block" /> Non placé
                    </span>
                    <span className="ml-auto">
                      {placements.length} / {tables.length} tables placées
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: Menu ─────────────────────────────────────── */}
          <TabsContent value="menu" className="space-y-5 pt-5">
            <div className="grid gap-5 lg:grid-cols-3">
              {/* ── Left: Add form ── */}
              <div className="space-y-4">
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <UtensilsCrossed className="size-4 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Ajouter un article</CardTitle>
                        <CardDescription className="text-xs">Plat, boisson ou entrée au menu</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-medium">Nom *</Label>
                      <Input
                        value={menuForm.name}
                        onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                        placeholder="Ex: Salade niçoise"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-medium">Description</Label>
                      <textarea
                        value={menuForm.description}
                        onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                        placeholder="Ingrédients, allergènes..."
                        rows={2}
                        className={cn('flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm',
                          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium">Prix (TND) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={menuForm.price}
                          onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                          placeholder="0.00"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium">Catégorie</Label>
                        <Select
                          value={menuForm.category}
                          onValueChange={(v) => setMenuForm({ ...menuForm, category: v as MenuCategory })}
                        >
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entree">Entrée</SelectItem>
                            <SelectItem value="plat">Plat</SelectItem>
                            <SelectItem value="dessert">Dessert</SelectItem>
                            <SelectItem value="boisson">Boisson</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                      <span className="text-sm font-medium">Disponible</span>
                      <Switch
                        checked={menuForm.isAvailable}
                        onCheckedChange={(v) => setMenuForm({ ...menuForm, isAvailable: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                      <span className="text-sm font-medium">Populaire ⭐</span>
                      <Switch
                        checked={menuForm.isPopular}
                        onCheckedChange={(v) => setMenuForm({ ...menuForm, isPopular: v })}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleCreateMenuItem}
                      disabled={menuCreating}
                      className="w-full rounded-xl gap-1.5"
                    >
                      {menuCreating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      Ajouter au menu
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* ── Right: Items list ── */}
              <div className="lg:col-span-2 space-y-3">
                {menuItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted p-12 text-center gap-3">
                    <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                      <UtensilsCrossed className="size-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Aucun article dans le menu</p>
                      <p className="text-xs text-muted-foreground mt-1">Ajoutez des plats, boissons et entrées depuis le formulaire.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(['entree', 'plat', 'dessert', 'boisson', 'autre'] as MenuCategory[]).map((cat) => {
                      const catItems = menuItems.filter((item) => item.category === cat);
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border', CATEGORY_COLORS[cat])}>
                              {CATEGORY_LABELS[cat]}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{catItems.length} article{catItems.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="space-y-2">
                            {catItems.map((item) => (
                              <Card key={item._id} className={cn('rounded-xl border-border/40', !item.isAvailable && 'opacity-60')}>
                                <CardContent className="p-3">
                                  {editingMenuItem?._id === item._id ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={editingMenuItem.name}
                                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, name: e.target.value })}
                                        className="rounded-lg text-sm h-8"
                                        placeholder="Nom"
                                      />
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={editingMenuItem.price}
                                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, price: parseFloat(e.target.value) || 0 })}
                                        className="rounded-lg text-sm h-8"
                                        placeholder="Prix"
                                      />
                                      <div className="flex gap-2">
                                        <Button type="button" size="sm" onClick={handleSaveEditMenuItem} className="rounded-lg h-7 text-xs flex-1 gap-1">
                                          <CheckCircle2 className="size-3" /> Sauvegarder
                                        </Button>
                                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingMenuItem(null)} className="rounded-lg h-7 text-xs">
                                          <X className="size-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                                          {item.isPopular && <Star className="size-3 text-amber-400 flex-shrink-0" />}
                                        </div>
                                        {item.description && (
                                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.description}</p>
                                        )}
                                        <span className="text-sm font-bold text-amber-400 mt-0.5 block">{item.price.toFixed(2)} TND</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <Switch
                                          checked={item.isAvailable}
                                          onCheckedChange={() => handleToggleMenuItemAvailability(item)}
                                          className="scale-75"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setEditingMenuItem(item)}
                                          className="size-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                          <BadgeCheck className="size-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMenuItem(item._id)}
                                          className="size-7 rounded-lg border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: Visite 360° ─────────────────────────────── */}
          <TabsContent value="tour360" className="pt-5">
            {isHotel ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="size-14 rounded-2xl bg-amber-400/10 flex items-center justify-center">
                    <ScanLine className="size-7 text-amber-400" />
                  </div>
                  <div className="max-w-sm">
                    <p className="font-semibold text-foreground">Expériences 360° par chambre</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Pour les hôtels, les expériences 360° sont gérées individuellement par chambre ou suite.
                      Ouvrez une chambre depuis l&apos;onglet <strong className="text-foreground">Chambres & Suites</strong> pour ajouter des images panoramiques ou créer une visite virtuelle.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-xl border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50"
                    onClick={() => {
                      const tab = document.querySelector('[value="rooms"]') as HTMLElement | null;
                      tab?.click();
                    }}
                  >
                    <BedDouble className="size-3.5" /> Aller aux Chambres & Suites
                  </Button>
                </CardContent>
              </Card>
            ) : isRestaurantOrCafe || isCoworking ? (
              <Panorama360Editor
                venueId={id}
                mode={isCoworking ? 'units' : 'tables'}
                api={isCoworking ? unitPlacementApis : tablePlacementApis}
              />
            ) : (
              <div className="space-y-4">
                <Card className="rounded-2xl border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><ScanLine className="size-4 text-amber-400" /> Gestion immersive 360°</CardTitle>
                    <CardDescription className="text-xs">
                      Upload 1 image = mode 360 simple. Upload 2+ images = mode snapshots/scènes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => void handleUnifiedTourUpload(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl gap-2"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      Ajouter photo(s) 360°
                    </Button>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <p className="text-[11px] text-zinc-500">Mode actif</p>
                        <p className="text-sm font-semibold text-white">{immersiveCount <= 1 ? '360 simple' : '360 + snapshots'}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <p className="text-[11px] text-zinc-500">Image principale</p>
                        <p className="text-sm font-semibold text-white">{form.immersiveFile ? 'Configurée' : 'Aucune'}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <p className="text-[11px] text-zinc-500">Snapshots/scènes</p>
                        <p className="text-sm font-semibold text-white">{tourData?.scenes?.length ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <VirtualTourBuilder
                  venueId={id}
                  initialScenes={tourData?.scenes ?? []}
                  initialHotspots={tourData?.hotspots ?? []}
                  onUpdated={() => {
                    refetchTour();
                    queryClient.invalidateQueries({ queryKey: ['venue', id] });
                  }}
                />
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Chambres (HOTEL only) ───────────────────── */}
          {isHotel && (
            <TabsContent value="rooms" className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Chambres & Suites</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{rooms.length} chambre{rooms.length !== 1 ? 's' : ''} configurée{rooms.length !== 1 ? 's' : ''}</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  onClick={() => setShowNewRoom(true)}
                >
                  <Plus className="size-3.5" /> Nouvelle chambre
                </Button>
              </div>

              {rooms.length === 0 ? (
                <Card className="rounded-2xl border-border/40">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <BedDouble className="size-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Aucune chambre</p>
                    <p className="text-xs text-muted-foreground mt-1">Ajoutez des chambres pour les rendre réservables</p>
                    <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowNewRoom(true)}>
                      <Plus className="size-3.5" /> Ajouter une chambre
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rooms.map((room) => {
                    const typeLabel = room.roomType === 'suite' ? 'Suite'
                      : room.roomType === 'villa' ? 'Villa'
                      : room.roomType === 'junior_suite' ? 'Junior Suite'
                      : room.roomType === 'presidential' ? 'Presidential'
                      : room.roomType === 'deluxe' ? 'Deluxe'
                      : 'Chambre';
                    const isSuiteOrAbove = ['suite', 'junior_suite', 'presidential', 'villa'].includes(room.roomType ?? '');
                    return (
                    <Card key={room._id} className={cn(
                      "rounded-2xl border transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-lg",
                      isSuiteOrAbove ? "border-amber-400/20 hover:border-amber-400/40" : "border-border/40 hover:border-border/70"
                    )}>
                      {/* Room image */}
                      <div className="relative h-32 rounded-t-2xl overflow-hidden bg-muted">
                        {room.coverImage ? (
                          <Image src={room.coverImage} alt={room.name ?? `Chambre ${room.roomNumber}`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BedDouble className="size-8 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* Type badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm",
                            isSuiteOrAbove
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : "bg-black/40 text-white/90 border border-white/10"
                          )}>
                            {isSuiteOrAbove && <Crown className="size-2.5" />}
                            {typeLabel}
                          </span>
                        </div>
                        {/* Price badge */}
                        <div className="absolute bottom-2 right-2">
                          <span className="inline-flex items-center rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-amber-300">
                            {room.pricePerNight} TND
                            <span className="text-white/40 ml-1 font-normal">/nuit</span>
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {room.name ?? `Chambre ${room.roomNumber}`}
                            </p>
                            {room.roomNumber && (
                              <p className="text-[10px] text-muted-foreground">N° {room.roomNumber}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
                            <Users className="size-3" />{room.capacityAdults ?? room.capacity ?? 2}
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs h-7" onClick={() => setEditingRoom(room)}>
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 rounded-lg border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/50"
                            onClick={() => setDeletingRoom(room)}
                            aria-label="Supprimer la chambre"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}

              {/* Room editor modals */}
              {showNewRoom && (
                <RoomEditorModal
                  hotelId={id}
                  room={null}
                  onClose={() => setShowNewRoom(false)}
                  onSave={async (payload) => {
                    await createAdminHotelRoom(id, payload);
                    await refetchRooms();
                    setShowNewRoom(false);
                    toast.success('Chambre créée.');
                  }}
                  onOpenTour={(r) => { setShowNewRoom(false); setTourRoom(r); }}
                />
              )}
              {editingRoom && (
                <RoomEditorModal
                  hotelId={id}
                  room={editingRoom}
                  onClose={() => setEditingRoom(null)}
                  onSave={async (payload) => {
                    await updateAdminHotelRoom(editingRoom._id, payload);
                    await refetchRooms();
                    setEditingRoom(null);
                    toast.success('Chambre mise à jour.');
                  }}
                  onOpenTour={(r) => { setEditingRoom(null); setTourRoom(r); }}
                />
              )}
              {tourRoom && (
                <RoomTourModal
                  venueId={id}
                  room={tourRoom}
                  onClose={() => { setTourRoom(null); refetchRooms(); }}
                />
              )}

              {/* Room delete confirmation */}
              <AlertDialog open={!!deletingRoom} onOpenChange={(open) => !open && !isDeletingRoom && setDeletingRoom(null)}>
                <AlertDialogContent className="border-zinc-800 bg-zinc-950">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-zinc-100">
                      Supprimer cette chambre ?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      <span className="font-semibold text-zinc-200">
                        {deletingRoom?.name ?? `Chambre ${deletingRoom?.roomNumber ?? ''}`}
                      </span>{' '}
                      sera définitivement supprimée. Cette action est{' '}
                      <span className="text-red-400 font-semibold">irréversible</span>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingRoom} className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isDeletingRoom}
                      onClick={(e) => { e.preventDefault(); handleDeleteRoom(); }}
                      className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/40"
                    >
                      {isDeletingRoom ? (
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
            </TabsContent>
          )}

          {/* ── TAB: Films & Séances (CINEMA only) ───────────────── */}
          {isCinema && (
            <TabsContent value="films" className="pt-5">
              <Card className="rounded-2xl border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Clapperboard className="size-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Films & Séances</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      La gestion des films et séances sera disponible prochainement.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-400">
                    <Sparkles className="size-3" /> Bientôt disponible
                  </span>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── TAB: Programme (EVENT only) ──────────────────────── */}
          {isEventSpace && (
            <TabsContent value="programme" className="pt-5">
              <Card className="rounded-2xl border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                    <PartyPopper className="size-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Programme & Billets</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      La gestion du programme et des billets sera disponible prochainement.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-400">
                    <Sparkles className="size-3" /> Bientôt disponible
                  </span>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── TAB: Réservations (all types) ────────────────────── */}
          <TabsContent value="reservations" className="pt-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border-border/40 lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><BookOpen className="size-4 text-amber-400" /> Réservations du lieu</CardTitle>
                  <CardDescription className="text-xs">20 dernières réservations liées à cet espace</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredVenueReservations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
                      Aucune réservation trouvée pour ce lieu.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredVenueReservations.map((r: any) => (
                        <div key={String(r._id)} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{r.reservationCode || r._id}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{r.guestFirstName || r.customerName || 'Client'} • {r.bookingType || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">{r.startAt ? new Date(r.startAt).toLocaleDateString('fr-FR') : '--'}</p>
                            <p className="text-[11px] font-semibold text-amber-300">{r.totalPrice ? `${r.totalPrice} TND` : '--'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Statut rapide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-300"><Clock3 className="size-4 text-amber-400" /> En attente</div>
                    <span className="text-sm font-bold text-white">{reservationStats.pending}</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-300"><CheckCircle className="size-4 text-emerald-400" /> Confirmées</div>
                    <span className="text-sm font-bold text-white">{reservationStats.confirmed}</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-300"><AlertCircle className="size-4 text-blue-400" /> Total</div>
                    <span className="text-sm font-bold text-white">{reservationStats.total}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom save bar - hidden, we use the header button */}
        <button type="submit" className="hidden" />
      </form>
    </div>
  );
}
