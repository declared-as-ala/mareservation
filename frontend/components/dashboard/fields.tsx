'use client';

import { useState } from 'react';
import { Eye, Pencil, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── PriceField ──────────────────────────────────────────────────────────
   Currency-aware numeric input with a large tap target. */

interface PriceFieldProps {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  /** e.g. "/ nuit", "/ heure", "min. consommation" */
  suffix?: string;
  currency?: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
}

export function PriceField({
  label,
  value,
  onChange,
  suffix,
  currency = 'TND',
  placeholder = '0',
  helper,
  required,
}: PriceFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-neutral-400">
        {label}
        {required && <span className="text-amber-400">*</span>}
      </span>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-amber-400/40 focus-within:ring-1 focus-within:ring-amber-400/20">
        <input
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? undefined : Math.max(0, Number(v)));
          }}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base font-semibold text-neutral-100 tabular-nums placeholder:text-neutral-700 focus:outline-none"
        />
        <span className="flex items-center gap-1 border-l border-white/[0.06] bg-white/[0.02] px-3.5 text-sm font-medium text-amber-400">
          {currency}
        </span>
      </div>
      {(suffix || helper) && (
        <span className="mt-1 block text-[11px] text-neutral-600">
          {suffix ? <span className="text-neutral-500">{suffix}</span> : null}
          {suffix && helper ? ' · ' : ''}
          {helper}
        </span>
      )}
    </label>
  );
}

/* ── DescriptionField ────────────────────────────────────────────────────
   Textarea with live character count + write/preview toggle. */

interface DescriptionFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  required?: boolean;
}

export function DescriptionField({
  label,
  value,
  onChange,
  placeholder = 'Décrivez l’ambiance, les spécialités, ce qui rend ce lieu unique…',
  maxLength = 2000,
  rows = 6,
  required,
}: DescriptionFieldProps) {
  const [preview, setPreview] = useState(false);
  const count = value.length;
  const near = count > maxLength * 0.9;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-neutral-400">
          {label}
          {required && <span className="text-amber-400">*</span>}
        </span>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-white/[0.05] hover:text-amber-300"
        >
          {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />}
          {preview ? 'Éditer' : 'Aperçu'}
        </button>
      </div>

      {preview ? (
        <div
          className="min-h-[8rem] whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-sm leading-relaxed text-neutral-300"
          style={{ minHeight: `${rows * 1.6}rem` }}
        >
          {value.trim() || <span className="text-neutral-700">Rien à prévisualiser.</span>}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-700 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
        />
      )}

      <div className="mt-1 flex justify-end">
        <span className={cn('text-[11px] tabular-nums', near ? 'text-amber-400' : 'text-neutral-600')}>
          {count} / {maxLength}
        </span>
      </div>
    </div>
  );
}

/* ── AmenitiesPicker ─────────────────────────────────────────────────────
   Chip multi-select with curated presets + free-form add. */

const PRESET_AMENITIES = [
  'Wi-Fi gratuit', 'Terrasse', 'Climatisation', 'Parking', 'Paiement par carte',
  'Accès PMR', 'Café de spécialité', 'Bar & lounge', 'Restaurant', 'Piscine',
  'Spa & bien-être', 'Salle de fitness', 'Petit-déjeuner', 'Salles de réunion',
  'Animaux acceptés', 'Vue mer', 'Room service', 'Réception 24h',
];

interface AmenitiesPickerProps {
  label?: string;
  value: string[];
  onChange: (v: string[]) => void;
}

export function AmenitiesPicker({ label = 'Équipements & services', value, onChange }: AmenitiesPickerProps) {
  const [query, setQuery] = useState('');

  function toggle(a: string) {
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  }
  function addCustom() {
    const a = query.trim();
    if (a && !value.includes(a)) onChange([...value, a]);
    setQuery('');
  }

  const suggestions = PRESET_AMENITIES.filter(
    (a) => !value.includes(a) && a.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-neutral-400">{label}</span>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 py-1 pl-3 pr-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-400/15"
            >
              {a}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}

      {/* Search / add */}
      <div className="flex items-stretch overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-amber-400/40">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Rechercher ou ajouter un équipement…"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:outline-none"
        />
        {query.trim() && (
          <button
            type="button"
            onClick={addCustom}
            className="flex items-center gap-1 border-l border-white/[0.06] bg-amber-400/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-400/15"
          >
            <Plus className="size-3.5" /> Ajouter
          </button>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 12).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-xs text-neutral-400 transition-colors hover:border-amber-400/30 hover:text-amber-300"
            >
              <Plus className="size-3" /> {a}
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-600">
          <Check className="size-3 text-emerald-500" />
          {value.length} équipement{value.length > 1 ? 's' : ''} sélectionné{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
