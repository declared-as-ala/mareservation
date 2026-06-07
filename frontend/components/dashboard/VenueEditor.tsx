'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Venue } from '@/lib/api/types';
import { Tabs, type TabItem } from './Tabs';
import { FormField, FormSection, dashInput } from './primitives';
import { MediaManager } from './MediaManager';
import { PriceField, DescriptionField, AmenitiesPicker } from './fields';

/** The universal, editable subset of a venue. */
interface VenueDraft {
  name: string;
  city: string;
  address: string;
  phone: string;
  shortDescription: string;
  description: string;
  startingPrice: number | undefined;
  priceRangeMin: number | undefined;
  priceRangeMax: number | undefined;
  amenities: string[];
}

function toDraft(v: Venue): VenueDraft {
  return {
    name: v.name ?? '',
    city: v.city ?? '',
    address: v.address ?? '',
    phone: v.phone ?? '',
    shortDescription: v.shortDescription ?? '',
    description: v.description ?? '',
    startingPrice: v.startingPrice,
    priceRangeMin: v.priceRangeMin,
    priceRangeMax: v.priceRangeMax,
    amenities: v.amenities ?? [],
  };
}

interface VenueEditorProps {
  venue: Venue;
  /** Persists the changed venue fields. Resolve on success. */
  onPatch: (payload: Partial<VenueDraft>) => Promise<void>;
  /** Type-specific tabs — Inventaire (tables/chambres/espaces), Visite 360°, Réservations. */
  extraTabs?: { id: string; label: string; count?: number; content: ReactNode }[];
}

/**
 * Unified venue editor — shared by the owner and admin dashboards.
 * Handles the universal tabs (Infos · Médias · Tarifs & description); the
 * caller supplies type-specific tabs via `extraTabs`.
 */
export function VenueEditor({ venue, onPatch, extraTabs = [] }: VenueEditorProps) {
  const initial = useMemo(() => toDraft(venue), [venue]);
  const [draft, setDraft] = useState<VenueDraft>(initial);
  const [active, setActive] = useState('infos');
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => (Object.keys(draft) as (keyof VenueDraft)[]).some((k) => JSON.stringify(draft[k]) !== JSON.stringify(initial[k])),
    [draft, initial]
  );

  function set<K extends keyof VenueDraft>(key: K, value: VenueDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error('Le nom de l’établissement est requis.');
      setActive('infos');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<VenueDraft> = {};
      (Object.keys(draft) as (keyof VenueDraft)[]).forEach((k) => {
        if (JSON.stringify(draft[k]) !== JSON.stringify(initial[k])) {
          (payload as Record<string, unknown>)[k] = draft[k];
        }
      });
      await onPatch(payload);
      toast.success('Modifications enregistrées');
    } catch {
      toast.error("L'enregistrement a échoué");
    } finally {
      setSaving(false);
    }
  }

  const tabs: TabItem[] = [
    { id: 'infos', label: 'Infos' },
    { id: 'medias', label: 'Médias' },
    { id: 'tarifs', label: 'Tarifs & description' },
    ...extraTabs.map((t) => ({ id: t.id, label: t.label, count: t.count })),
  ];

  return (
    <div className="space-y-6">
      <Tabs items={tabs} active={active} onChange={setActive} layoutId="venue-editor-tab" />

      <AnimatePresence mode="wait">
        {/* ── Infos ── */}
        {active === 'infos' && (
          <motion.div
            key="infos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <FormSection title="Informations générales" description="Le nom et la localisation visibles par vos clients.">
              <FormField label="Nom de l’établissement" required>
                <input
                  className={dashInput}
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ex. Nour Coffee House"
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Ville">
                  <input className={dashInput} value={draft.city} onChange={(e) => set('city', e.target.value)} />
                </FormField>
                <FormField label="Téléphone">
                  <input
                    className={dashInput}
                    value={draft.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+216 .."
                  />
                </FormField>
              </div>
              <FormField label="Adresse">
                <input className={dashInput} value={draft.address} onChange={(e) => set('address', e.target.value)} />
              </FormField>
              <FormField label="Accroche courte" helper="Une phrase affichée sous le nom (max ~120 caractères).">
                <input
                  className={dashInput}
                  value={draft.shortDescription}
                  maxLength={140}
                  onChange={(e) => set('shortDescription', e.target.value)}
                  placeholder="Ex. Coffee shop de spécialité au cœur du Lac 2."
                />
              </FormField>
            </FormSection>
          </motion.div>
        )}

        {/* ── Médias ── */}
        {active === 'medias' && (
          <motion.div
            key="medias"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MediaManager
              venueId={venue._id}
              coverImage={venue.coverImage}
              gallery={venue.gallery}
            />
          </motion.div>
        )}

        {/* ── Tarifs & description ── */}
        {active === 'tarifs' && (
          <motion.div
            key="tarifs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-7"
          >
            <FormSection title="Tarifs" description="Les prix affichés sur la fiche publique.">
              <div className="grid gap-4 sm:grid-cols-3">
                <PriceField
                  label="À partir de"
                  value={draft.startingPrice}
                  onChange={(v) => set('startingPrice', v)}
                  suffix="prix d’appel"
                />
                <PriceField
                  label="Prix minimum"
                  value={draft.priceRangeMin}
                  onChange={(v) => set('priceRangeMin', v)}
                />
                <PriceField
                  label="Prix maximum"
                  value={draft.priceRangeMax}
                  onChange={(v) => set('priceRangeMax', v)}
                />
              </div>
            </FormSection>

            <FormSection title="Description" description="Présentez l’ambiance et ce qui rend ce lieu unique.">
              <DescriptionField
                label="Description complète"
                value={draft.description}
                onChange={(v) => set('description', v)}
              />
              <AmenitiesPicker value={draft.amenities} onChange={(v) => set('amenities', v)} />
            </FormSection>
          </motion.div>
        )}

        {/* ── Type-specific tabs ── */}
        {extraTabs.map(
          (t) =>
            active === t.id && (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {t.content}
              </motion.div>
            )
        )}
      </AnimatePresence>

      {/* ── Sticky save bar (universal tabs only; Médias saves itself) ── */}
      <AnimatePresence>
        {dirty && active !== 'medias' && !extraTabs.some((t) => t.id === active) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-[#161616]/95 px-5 py-3 shadow-2xl backdrop-blur-md"
          >
            <span className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="size-2 rounded-full bg-amber-400" />
              Modifications non enregistrées
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(initial)}
                disabled={saving}
                className="rounded-xl border border-white/[0.1] px-3.5 py-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all',
                  'hover:-translate-y-0.5 hover:shadow-amber-400/40 disabled:cursor-not-allowed disabled:opacity-60'
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Enregistrer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!dirty && active !== 'medias' && !extraTabs.some((t) => t.id === active) && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-700">
          <Check className="size-3 text-emerald-600" />
          Tout est enregistré
        </p>
      )}
    </div>
  );
}
