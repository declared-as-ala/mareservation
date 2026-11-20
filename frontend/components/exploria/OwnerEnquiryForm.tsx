'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitPartnerApplication } from '@/lib/api/partners';
import { cn } from '@/lib/utils';

const input =
  'mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-[#0B0B0C] px-4 text-[0.95rem] text-neutral-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20';

/** Owner enquiry → stored as a PartnerApplication (existing backend endpoint, rate-limited). */
export function OwnerEnquiryForm() {
  const uid = useId();
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get('website')) return; // honeypot: bots fill hidden fields
    if (!consent) {
      setError('Merci d’accepter l’utilisation de vos données pour être recontacté.');
      return;
    }
    setError(null);
    setState('sending');
    try {
      await submitPartnerApplication({
        establishmentName: String(form.get('establishmentName') ?? '').trim(),
        contactName: String(form.get('contactName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        city: String(form.get('city') ?? '').trim(),
        message: String(form.get('message') ?? '').trim() || undefined,
      });
      setState('done');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error && err.message ? err.message : 'Envoi impossible pour le moment. Veuillez réessayer.');
    }
  }

  if (state === 'done') {
    return (
      <div role="status" className="rounded-[1.75rem] bg-[#111112] p-10 text-center text-white">
        <CheckCircle2 className="mx-auto size-10 text-amber-400" aria-hidden="true" />
        <h2 className="mt-5 font-serif text-3xl font-medium">Merci, votre demande est envoyée.</h2>
        <p className="mt-3 text-white/75">Nous reviendrons vers vous prochainement.</p>
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`${uid}-${name}`} className="text-sm font-medium text-white">{label}</label>
      <input id={`${uid}-${name}`} name={name} required className={input} {...props} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-[1.75rem] border border-white/10 bg-[#111112] p-6 sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        {field('establishmentName', 'Nom de la maison d’hôtes', { autoComplete: 'organization', maxLength: 120 })}
        {field('city', 'Ville', { autoComplete: 'address-level2', maxLength: 80 })}
        {field('contactName', 'Votre nom', { autoComplete: 'name', maxLength: 120 })}
        {field('phone', 'Téléphone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: 30 })}
      </div>
      {field('email', 'Adresse e-mail', { type: 'email', autoComplete: 'email', maxLength: 160 })}
      <div>
        <label htmlFor={`${uid}-message`} className="text-sm font-medium text-white">Message (facultatif)</label>
        <textarea id={`${uid}-message`} name="message" rows={4} maxLength={2000} className={cn(input, 'h-auto py-3')} />
      </div>
      {/* Honeypot — hidden from people and assistive tech */}
      <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
        <label>Ne pas remplir<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <label className="flex items-start gap-3 text-sm leading-relaxed text-neutral-400">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-amber-400" />
        <span>
          J’accepte que ces informations soient utilisées pour me recontacter, conformément à la{' '}
          <Link href="/confidentialite" className="font-medium text-amber-400 underline">politique de confidentialité</Link>.
        </span>
      </label>

      <p role="alert" aria-live="assertive" className={cn('text-sm text-red-400', !error && 'sr-only')}>{error}</p>

      <button
        type="submit"
        disabled={state === 'sending'}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-8 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300 disabled:opacity-60 sm:w-auto"
      >
        {state === 'sending' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Envoyer ma demande
      </button>
    </form>
  );
}
