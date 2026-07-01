'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, Loader2, CheckCircle2, Building2, User, Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { submitPartnerApplication } from '@/lib/api/partners';

interface PartnerApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = { establishmentName: '', contactName: '', email: '', phone: '', city: '', message: '' };

export function PartnerApplicationModal({ open, onOpenChange }: PartnerApplicationModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset + lock scroll while open.
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setDone(false);
      setLoading(false);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!form.establishmentName.trim() || !form.contactName.trim() || !form.email.trim() || !form.phone.trim() || !form.city.trim()) {
      toast.error('Veuillez remplir tous les champs requis.');
      return;
    }
    setLoading(true);
    try {
      await submitPartnerApplication({
        establishmentName: form.establishmentName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        message: form.message.trim() || undefined,
      });
      setDone(true);
      toast.success('Demande envoyée ! Notre équipe vous recontactera.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !open) return null;

  const field = (
    key: keyof typeof form,
    label: string,
    Icon: typeof Building2,
    opts: { type?: string; placeholder?: string; required?: boolean; textarea?: boolean } = {}
  ) => (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400">
        <Icon className="size-3.5 text-amber-400" />
        {label}
        {opts.required && <span className="text-red-400">*</span>}
      </label>
      {opts.textarea ? (
        <textarea
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={opts.placeholder}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none transition-all focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
        />
      ) : (
        <input
          type={opts.type ?? 'text'}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={opts.placeholder}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none transition-all focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
        />
      )}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-gradient-to-r from-amber-400/[0.08] to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Store className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Devenir partenaire</h2>
              <p className="text-[11px] text-neutral-500">Référencez votre établissement sur Exploria360</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-400" />
            </span>
            <h3 className="text-lg font-bold text-white">Demande envoyée !</h3>
            <p className="max-w-xs text-sm text-neutral-400">
              Merci. Notre équipe étudie votre demande et vous recontactera très vite.
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2 h-11 rounded-xl bg-amber-400 px-6 text-sm font-bold text-black transition-all hover:bg-amber-300"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {field('establishmentName', "Nom de l'établissement", Building2, { required: true, placeholder: 'Ex : Café Lumière' })}
              {field('contactName', 'Votre nom', User, { required: true, placeholder: 'Nom et prénom' })}
              {field('email', 'Email', Mail, { required: true, type: 'email', placeholder: 'vous@exemple.com' })}
              {field('phone', 'Téléphone', Phone, { required: true, type: 'tel', placeholder: '+216 XX XXX XXX' })}
              {field('city', 'Ville', MapPin, { required: true, placeholder: 'Ex : Tunis' })}
              {field('message', 'Message (optionnel)', MessageSquare, { textarea: true, placeholder: 'Parlez-nous de votre établissement…' })}
            </div>
            <div className="border-t border-white/[0.06] px-5 py-4">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
                  loading ? 'cursor-not-allowed bg-white/[0.06] text-neutral-500' : 'bg-amber-400 text-black shadow-lg shadow-amber-400/20 hover:bg-amber-300'
                )}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Store className="size-4" />}
                {loading ? 'Envoi…' : 'Envoyer ma demande'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
