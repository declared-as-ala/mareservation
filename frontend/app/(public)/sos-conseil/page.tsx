'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  TriangleAlert,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Headset,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  submitSOSConseil,
  type SOSConseilPayload,
  type ContactPreferenceOpt,
  type SOSConseilChatSuccessData,
} from '@/lib/api/sos-conseil';
import type { SOSAssistantExtracted } from '@/lib/sos-conseil-mapper';
import {
  mergeExtractedIntoForm,
  buildAiAssistSummary,
  type SOSConseilFormShape,
} from '@/lib/sos-conseil-mapper';
import { SOSConseilAssistant } from '@/components/sos-conseil/SOSConseilAssistant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const OCCASIONS = [
  { value: 'birthday', label: 'Anniversaire' },
  { value: 'wedding_engagement', label: 'Mariage / Fiançailles' },
  { value: 'business_meeting', label: "Réunion d'affaires" },
  { value: 'family_event', label: 'Événement familial' },
  { value: 'romantic_dinner', label: 'Dîner romantique' },
  { value: 'graduation', label: 'Remise de diplôme' },
  { value: 'corporate', label: "Soirée d'entreprise" },
  { value: 'other', label: 'Autre' },
];

const AGE_RANGES = ['18-20', '20-30', '30-40', '40-50', '50-60', '+60'] as const;

const CATEGORIES = [
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'cinema', label: 'Cinéma' },
  { value: 'event_space', label: 'Espace événementiel' },
  { value: 'lounge', label: 'Lounge / salon' },
  { value: 'rooftop', label: 'Rooftop / terrasse' },
];

/** Clés utilisées aussi par les emails admin (email.service backend) */
const BUDGET_PRESETS = [
  { value: 'moins_100', label: 'Moins de 100 TND' },
  { value: '100_300', label: '100 – 300 TND' },
  { value: '300_600', label: '300 – 600 TND' },
  { value: '600_1000', label: '600 – 1000 TND' },
  { value: 'plus_1000', label: 'Plus de 1000 TND' },
];

const AMBIANCE_PRESETS = [
  'Romantique',
  'Luxe',
  'Famille',
  'Professionnel',
  'Calme',
  'Musique live',
  'Vue mer',
  'Privatif',
];

type FormState = SOSConseilFormShape;
type FormFieldKey = keyof FormState;

type AssistantState = {
  missingFields: string[];
  readyToSubmit: boolean;
  confidence: Record<string, number>;
};

const REQUIRED_MAP = {
  fullName: 'Nom complet',
  phone: 'Téléphone',
  occasionType: 'Type d’événement',
  participantsCount: 'Participants',
  averageAgeRanges: 'Tranches d’âge',
  preferredRegion: 'Région',
  preferredCategory: 'Type de lieu',
} as const satisfies Partial<Record<FormFieldKey, string>>;
const REQUIRED_LABELS: Partial<Record<FormFieldKey, string>> = REQUIRED_MAP;

const INITIAL: FormState = {
  fullName: '',
  phone: '',
  email: '',
  occasionType: '',
  participantsCount: '',
  averageAgeRanges: [],
  preferredRegion: '',
  preferredCategory: '',
  budgetRange: '',
  ambianceTags: [],
  contactPreference: '',
  preferredDate: '',
  preferredTime: '',
  details: '',
};

export default function SOSConseilPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /** Mobile-only: the assistant opens as a floating chat bubble overlay. */
  const [chatOpen, setChatOpen] = useState(false);

  /** Dernière extraction serveur IA (pour résumé + merge) */
  const [assistExtracted, setAssistExtracted] = useState<SOSAssistantExtracted | null>(null);
  /** L’utilisateur a interagi avec l’assistant (chat ou fusion manuelle prévue après chat) */
  const [assistTouched, setAssistTouched] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>({
    missingFields: [],
    readyToSubmit: false,
    confidence: {},
  });
  const [aiFilledKeys, setAiFilledKeys] = useState<Set<FormFieldKey>>(new Set());

  const setField = (key: keyof FormState, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setAiFilledKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const toggleAgeRange = (range: string) => {
    setForm((prev) => {
      const has = prev.averageAgeRanges.includes(range);
      return {
        ...prev,
        averageAgeRanges: has
          ? prev.averageAgeRanges.filter((r) => r !== range)
          : [...prev.averageAgeRanges, range],
      };
    });
  };

  const toggleAmbiance = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    setForm((prev) => {
      const has = prev.ambianceTags.includes(t);
      return {
        ...prev,
        ambianceTags: has ? prev.ambianceTags.filter((x) => x !== t) : [...prev.ambianceTags, t],
      };
    });
  };

  const formSnapshotForChat = useCallback((): Record<string, unknown> => {
    return {
      ...form,
    };
  }, [form]);

  const applyMergedFromAssistant = useCallback((payload: SOSConseilChatSuccessData & { extractedData: SOSAssistantExtracted }) => {
    const extracted = payload.extractedData;
    setAssistExtracted(extracted);
    setAssistantState({
      missingFields: payload.missingFields ?? [],
      readyToSubmit: Boolean(payload.readyToSubmit),
      confidence: payload.confidence ?? {},
    });
    setForm((prev) => {
      const patch = mergeExtractedIntoForm(prev, extracted);
      const next = { ...prev };
      const newlyAiFilled = new Set<FormFieldKey>();
      for (const [rawKey, rawValue] of Object.entries(patch) as Array<[FormFieldKey, string | string[] | undefined]>) {
        const key = rawKey as FormFieldKey;
        const value = rawValue;
        if (value === undefined) continue;
        const current = prev[key];
        const currentEmpty =
          typeof current === 'string'
            ? !current.trim()
            : Array.isArray(current)
              ? current.length === 0
              : !current;
        if (currentEmpty || aiFilledKeys.has(key)) {
          (next[key] as string | string[]) = value;
          newlyAiFilled.add(key);
        }
      }
      if (newlyAiFilled.size > 0) {
        setAiFilledKeys((existing) => {
          const merged = new Set(existing);
          newlyAiFilled.forEach((k) => merged.add(k));
          return merged;
        });
      }
      return next;
    });
    setAssistTouched(true);
  }, [aiFilledKeys]);

  const missingRequired = useMemo(() => {
    const m: Array<FormFieldKey> = [];
    if (!form.fullName.trim()) m.push('fullName');
    if (!form.phone.trim()) m.push('phone');
    if (!form.occasionType.trim()) m.push('occasionType');
    if (!form.participantsCount.trim() || Number(form.participantsCount) <= 0) m.push('participantsCount');
    if (!form.averageAgeRanges.length) m.push('averageAgeRanges');
    if (!form.preferredRegion.trim()) m.push('preferredRegion');
    if (!form.preferredCategory.trim()) m.push('preferredCategory');
    return m;
  }, [form]);

  const completionPercent = useMemo(() => {
    const total = Object.keys(REQUIRED_MAP).length;
    return Math.round(((total - missingRequired.length) / total) * 100);
  }, [missingRequired]);

  const canSubmit = missingRequired.length === 0 && !submitting;
  const missingLabels = missingRequired.map((k) => REQUIRED_LABELS[k] ?? k);

  const validate = () => {
    if (!form.fullName.trim()) return 'Nom complet requis.';
    if (!form.phone.trim()) return 'Téléphone requis.';
    if (!form.occasionType) return "Type d'événement requis.";
    if (!form.participantsCount || Number(form.participantsCount) <= 0) return 'Nombre de participants invalide.';
    if (form.averageAgeRanges.length < 1) return "Sélectionnez au moins une tranche d'âge.";
    if (!form.preferredRegion.trim()) return 'Région requise.';
    if (!form.preferredCategory) return 'Type de lieu requis.';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) return 'Adresse email invalide.';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      const aiSummary =
        assistTouched ?
          buildAiAssistSummary(assistExtracted ?? undefined, form.details)
        : undefined;

      const payload: SOSConseilPayload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        occasionType: form.occasionType,
        participantsCount: Number(form.participantsCount),
        averageAgeRanges: [...new Set(form.averageAgeRanges)],
        preferredRegion: form.preferredRegion.trim(),
        preferredCategory: form.preferredCategory,
        budgetRange: form.budgetRange || undefined,
        ambianceTags:
          form.ambianceTags?.length ?
            [...new Set(form.ambianceTags.filter(Boolean))]
          : undefined,
        contactPreference: (form.contactPreference || undefined) as ContactPreferenceOpt | undefined,
        aiAssistSummary: aiSummary ?? undefined,
        preferredDate: form.preferredDate || undefined,
        preferredTime: form.preferredTime || undefined,
        details: form.details.trim() || undefined,
      };
      await submitSOSConseil(payload);
      setSubmitted(true);
      toast.success('Demande envoyée', {
        description:
          'Votre demande a été envoyée. Notre équipe vous contactera rapidement avec les meilleures recommandations.',
      });
    } catch {
      toast.error('Erreur lors de l’envoi', { description: 'Veuillez réessayer.' });
    } finally {
      setSubmitting(false);
    }
  };

  const contactChoices = useMemo(
    () =>
      (
        [
          { value: 'whatsapp' as const, label: 'WhatsApp' },
          { value: 'phone' as const, label: 'Téléphone' },
          { value: 'email' as const, label: 'Email' },
        ]
      ),
    []
  );

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-white/[0.08] bg-white/[0.03] text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/30">
              <CheckCircle2 className="size-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Merci pour votre demande</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Votre demande a été envoyée. Notre équipe vous contactera rapidement avec les meilleures recommandations.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                setForm(INITIAL);
                setAssistExtracted(null);
                setAssistTouched(false);
                setAssistantState({ missingFields: [], readyToSubmit: false, confidence: {} });
                setAiFilledKeys(new Set());
              }}
              className="bg-amber-400 hover:bg-amber-300 text-black"
            >
              Nouvelle demande
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#15110a] via-black to-black">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-amber-500/[0.10] blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-14">
          <div className="mb-5 flex">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
            <Headset className="size-3.5" />
            Service Conciergerie
          </div>
          <h1 className="mt-4 font-serif text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            SOS Conseil
          </h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
            Décrivez votre événement à notre assistant — il cadre votre besoin et remplit la demande pour vous. Notre équipe vous recontacte avec les meilleures recommandations.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { Icon: Zap, label: 'Réponse rapide' },
              { Icon: Sparkles, label: 'Sur-mesure' },
              { Icon: ShieldCheck, label: 'Sans engagement' },
            ].map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300">
                <Icon className="size-3.5 text-amber-400" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:py-10 lg:pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Form column */}
          <div className="lg:col-span-7">
            <Card className="border-white/[0.08] bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-white">Votre demande</CardTitle>
                <CardDescription>
                  Le formulaire se complète automatiquement selon la conversation. Vous pouvez toujours modifier chaque champ.
                </CardDescription>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Demande complétée à {completionPercent}%</span>
                    <span className={cn('font-medium', completionPercent === 100 ? 'text-emerald-400' : 'text-amber-300')}>
                      {completionPercent === 100 ? 'Prêt à envoyer' : 'À compléter'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        completionPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-yellow-600'
                      )}
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                  {missingLabels.length > 0 ? (
                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                      Champs requis manquants: {missingLabels.join(', ')}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                      Tous les champs requis sont remplis.
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={onSubmit} noValidate>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 flex items-center justify-between">Nom complet * {aiFilledKeys.has('fullName') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <Input
                        value={form.fullName}
                        onChange={(e) => setField('fullName', e.target.value)}
                        className={cn('bg-zinc-900/70 border-zinc-700', missingRequired.includes('fullName') && 'border-amber-400/60')}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center justify-between">Téléphone * {aiFilledKeys.has('phone') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        className={cn('bg-zinc-900/70 border-zinc-700', missingRequired.includes('phone') && 'border-amber-400/60')}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block">Email (optionnel)</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-2 flex items-center justify-between">Type d&apos;événement * {aiFilledKeys.has('occasionType') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <Select value={form.occasionType} onValueChange={(v) => setField('occasionType', v)}>
                        <SelectTrigger className={cn('w-full bg-zinc-900/70 border-zinc-700', missingRequired.includes('occasionType') && 'border-amber-400/60')}>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          {OCCASIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center justify-between">Participants * {aiFilledKeys.has('participantsCount') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.participantsCount}
                        onChange={(e) => setField('participantsCount', e.target.value)}
                        className={cn('bg-zinc-900/70 border-zinc-700', missingRequired.includes('participantsCount') && 'border-amber-400/60')}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="mb-2 block">Budget (optionnel)</Label>
                      <Select
                        value={form.budgetRange || '__none'}
                        onValueChange={(v) => setField('budgetRange', v === '__none' ? '' : v)}
                      >
                        <SelectTrigger className="w-full bg-zinc-900/70 border-zinc-700">
                          <SelectValue placeholder="Indicatif" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectItem value="__none">Non précisé</SelectItem>
                          {BUDGET_PRESETS.map((b) => (
                            <SelectItem key={b.value} value={b.value}>
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="mb-2 flex items-center justify-between">Tranches d&apos;âge * (choix multiples) {aiFilledKeys.has('averageAgeRanges') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <p className="text-[11px] text-zinc-500 mb-2">
                        Sélectionnez toutes les tranches qui correspondent à votre groupe.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {AGE_RANGES.map((range) => {
                          const selected = form.averageAgeRanges.includes(range);
                          return (
                            <button
                              key={range}
                              type="button"
                              onClick={() => toggleAgeRange(range)}
                              className={cn(
                                'px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                                selected ?
                                  'border-amber-400 bg-amber-400/15 text-amber-300'
                                : missingRequired.includes('averageAgeRanges')
                                  ? 'border-amber-400/40 text-zinc-300 hover:text-zinc-100'
                                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                              )}
                            >
                              {range} ans
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center justify-between">Région * {aiFilledKeys.has('preferredRegion') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <Input
                        value={form.preferredRegion}
                        onChange={(e) => setField('preferredRegion', e.target.value)}
                        className={cn('bg-zinc-900/70 border-zinc-700', missingRequired.includes('preferredRegion') && 'border-amber-400/60')}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center justify-between">Type de lieu * {aiFilledKeys.has('preferredCategory') ? <span className="text-[10px] text-emerald-400">IA</span> : null}</Label>
                      <Select
                        value={form.preferredCategory}
                        onValueChange={(v) => setField('preferredCategory', v)}
                      >
                        <SelectTrigger className={cn('w-full bg-zinc-900/70 border-zinc-700', missingRequired.includes('preferredCategory') && 'border-amber-400/60')}>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="mb-2 block">Ambiance souhaitée</Label>
                      <p className="text-[11px] text-zinc-500 mb-2">
                        Sélectionnez un ou plusieurs critères ou précisez dans les détails.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {AMBIANCE_PRESETS.map((tag) => {
                          const selected = form.ambianceTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleAmbiance(tag)}
                              className={cn(
                                'px-3 py-2 rounded-full border text-xs transition-colors',
                                selected ?
                                  'border-amber-400/60 bg-amber-400/15 text-amber-200'
                                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="mb-3 block text-zinc-200">Comment préférez-vous être contacté ?</Label>
                      <div className="flex flex-wrap gap-2">
                        {contactChoices.map((c) => {
                          const on = form.contactPreference === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() =>
                                setField('contactPreference', on ? '' : (c.value as ContactPreferenceOpt))
                              }
                              className={cn(
                                'rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
                                on ?
                                  'border-amber-400 bg-amber-400/15 text-amber-200'
                                : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                              )}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Date (optionnel)</Label>
                      <Input
                        type="date"
                        value={form.preferredDate}
                        onChange={(e) => setField('preferredDate', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-700"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Heure (optionnel)</Label>
                      <Input
                        type="time"
                        value={form.preferredTime}
                        onChange={(e) => setField('preferredTime', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block">Détails (optionnel)</Label>
                      <Textarea
                        value={form.details}
                        onChange={(e) => setField('details', e.target.value)}
                        className="min-h-28 bg-zinc-900/70 border-zinc-700"
                      />
                    </div>
                  </div>

                  {assistantState.missingFields.length > 0 ? (
                    <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-100 flex items-start gap-2">
                      <TriangleAlert className="size-4 mt-0.5 shrink-0" />
                      <span>L’assistant attend encore: {assistantState.missingFields.join(', ')}</span>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full h-12 bg-amber-400 hover:bg-amber-300 text-black font-semibold"
                  >
                    {submitting ? 'Envoi en cours…' : 'Valider et envoyer ma demande'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Assistant column — desktop only (mobile uses the floating bubble) */}
          <div className="hidden lg:col-span-5 lg:sticky lg:top-6 lg:block">
            <SOSConseilAssistant
              getCurrentFormSnapshot={formSnapshotForChat}
              onAssistantReply={(payload) => {
                applyMergedFromAssistant(payload);
              }}
              className="lg:min-h-[700px]"
            />
          </div>
        </div>
      </div>

      {/* ── Mobile floating assistant bubble ── */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Ouvrir l'assistant IA"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-3.5 text-sm font-black text-black shadow-[0_12px_34px_rgba(245,158,11,0.5)] transition-transform active:scale-95 lg:hidden"
        >
          <span className="relative flex size-5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-black/20" />
            <Sparkles className="relative size-5" />
          </span>
          Assistant IA
        </button>
      )}

      {/* ── Mobile assistant overlay ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setChatOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col">
            <SOSConseilAssistant
              getCurrentFormSnapshot={formSnapshotForChat}
              onAssistantReply={(payload) => {
                applyMergedFromAssistant(payload);
              }}
              onClose={() => setChatOpen(false)}
              className="h-full rounded-b-none border-b-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
