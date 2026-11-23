'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitPartnerApplication } from '@/lib/api/partners';
import { GOVERNORATES } from '@/lib/api/bookings';

const field = 'mt-1.5 h-12 w-full rounded-xl border border-white/12 bg-[#0B0B0C] px-4 text-[15px] text-white outline-none placeholder:text-neutral-600 focus:border-amber-400/60 [color-scheme:dark]';

/** Saves a real partner application (backend: /partner-applications, reviewed in /admin/partners). */
export function HostApplicationForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('website')) return; // honeypot
    setState('sending');
    setError(null);
    try {
      const rooms = String(f.get('rooms') ?? '');
      await submitPartnerApplication({
        establishmentName: String(f.get('establishmentName') ?? '').trim(),
        contactName: String(f.get('contactName') ?? '').trim(),
        email: String(f.get('email') ?? '').trim(),
        phone: String(f.get('phone') ?? '').trim(),
        city: [String(f.get('city') ?? '').trim(), String(f.get('governorate') ?? '')].filter(Boolean).join(', '),
        message: [
          "Type : maison d'hôtes",
          rooms && `Chambres : ${rooms}`,
          `Visite 360° existante : ${f.get('tour') ? 'Oui' : 'Non'}`,
          String(f.get('message') ?? '').trim(),
        ].filter(Boolean).join('\n'),
      });
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible. Réessayez.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div role="status" className="rounded-[1.6rem] border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-300" aria-hidden="true" />
        <h3 className="mt-4 font-serif text-2xl text-white">Candidature envoyée</h3>
        <p className="mt-2 text-neutral-300">Merci ! Notre équipe étudie votre maison et vous recontacte rapidement pour la visite 360° et l’ouverture de votre espace propriétaire.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-neutral-300 sm:col-span-2">Nom de la maison d’hôtes<input name="establishmentName" required maxLength={140} className={field} /></label>
      <label className="text-sm text-neutral-300">Votre nom<input name="contactName" required maxLength={120} autoComplete="name" className={field} /></label>
      <label className="text-sm text-neutral-300">Téléphone<input name="phone" required type="tel" inputMode="tel" placeholder="+216 …" autoComplete="tel" className={field} /></label>
      <label className="text-sm text-neutral-300 sm:col-span-2">E-mail<input name="email" required type="email" autoComplete="email" className={field} /></label>
      <label className="text-sm text-neutral-300">Ville<input name="city" required maxLength={80} className={field} /></label>
      <label className="text-sm text-neutral-300">Gouvernorat
        <select name="governorate" className={field} defaultValue="">
          <option value="">—</option>
          {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <label className="text-sm text-neutral-300">Nombre de chambres<input name="rooms" type="number" min={1} max={50} className={field} /></label>
      <label className="flex items-center gap-3 self-end pb-3 text-sm text-neutral-300"><input type="checkbox" name="tour" className="size-5 accent-amber-400" /> J’ai déjà une visite 360°</label>
      <label className="text-sm text-neutral-300 sm:col-span-2">Parlez-nous de votre maison (facultatif)<textarea name="message" rows={4} maxLength={3000} className={`${field} h-auto py-3`} /></label>
      <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true"><label>Ne pas remplir<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{error}</p>}
      <button type="submit" disabled={state === 'sending'} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-black disabled:opacity-60 sm:col-span-2">
        {state === 'sending' && <Loader2 className="size-5 animate-spin" aria-hidden="true" />} Envoyer ma candidature
      </button>
      <p className="text-xs text-neutral-500 sm:col-span-2">Vos coordonnées servent uniquement à traiter votre candidature (voir notre politique de confidentialité).</p>
    </form>
  );
}
