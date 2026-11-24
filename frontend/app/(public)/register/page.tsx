'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Mail, Phone, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { register } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';
import { resolvePostLoginRedirect } from '@/lib/auth/redirect';
import { Alert, Button, Field, PasswordInput, passwordIsStrong } from '@/components/ds';
import { AuthLayout } from '@/components/ds/AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Same rule as the API: Tunisian number (8 digits, optional +216/00216) or international +XXXXXXXX.
const PHONE_RE = /^(?:(?:\+|00)216)?[2-9]\d{7}$|^\+\d{8,15}$/;

type Errors = Partial<Record<'fullName' | 'email' | 'phone' | 'password' | 'confirm', string>>;

function validate(v: { fullName: string; email: string; phone: string; password: string; confirm: string }): Errors {
  const e: Errors = {};
  if (v.fullName.trim().length < 2) e.fullName = 'Indiquez votre nom complet.';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Adresse e-mail invalide.';
  if (v.phone.trim() && !PHONE_RE.test(v.phone.replace(/[\s().-]/g, ''))) e.phone = 'Numéro invalide (ex. 22 333 444 ou +216 22 333 444).';
  if (!passwordIsStrong(v.password)) e.password = 'Le mot de passe ne respecte pas toutes les exigences.';
  if (!v.confirm) e.confirm = 'Confirmez le mot de passe.';
  else if (v.confirm !== v.password) e.confirm = 'Les mots de passe ne correspondent pas.';
  return e;
}

function RegisterForm() {
  const router = useRouter();
  const returnTo = useSearchParams().get('returnTo');
  const { setAuth } = useAuthStore();
  const [v, setV] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const errors = validate(v);
  if (emailTaken && v.email.trim().toLowerCase() === emailTaken) errors.email = 'Un compte existe déjà avec cet e-mail.';
  const show = (k: keyof Errors) => (submitted || touched[k] ? errors[k] : undefined);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((cur) => ({ ...cur, [k]: e.target.value }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length || inFlight.current) {
      const first = Object.keys(errors)[0];
      if (first) document.getElementById(`reg-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    setLoading(true);
    try {
      const res: any = await register({ fullName: v.fullName.trim(), email: v.email.trim().toLowerCase(), password: v.password, phone: v.phone.trim() || undefined });
      const user = res.user;
      setAuth({ id: user.id ?? user._id, fullName: user.fullName, email: user.email, role: user.role, emailVerified: user.emailVerified }, res.accessToken);
      toast.success('Bienvenue sur Exploria360 ! Votre compte est créé.');
      router.replace(resolvePostLoginRedirect(user.role, returnTo));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Inscription impossible.';
      if (/existe déjà/i.test(msg)) {
        setEmailTaken(v.email.trim().toLowerCase());
        document.getElementById('reg-email')?.focus();
      } else setServerError(msg);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Réservez plus vite et retrouvez toutes vos réservations au même endroit."
      footer={<>Déjà inscrit ? <Link href={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="font-semibold text-[#17140f] underline-offset-4 hover:underline">Se connecter</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert onClose={() => setServerError(null)}>{serverError}</Alert>}
        <Field id="reg-fullName" label="Nom complet" icon={<UserRound />} autoComplete="name" value={v.fullName} onChange={set('fullName')} onBlur={blur('fullName')} error={show('fullName')} placeholder="Leïla Ben Salah" maxLength={120} />
        <Field id="reg-email" label="E-mail" icon={<Mail />} type="email" inputMode="email" autoComplete="email" value={v.email} onChange={set('email')} onBlur={blur('email')} error={show('email') ?? (errors.email && emailTaken ? errors.email : undefined)} placeholder="vous@exemple.com" />
        <Field id="reg-phone" label="Téléphone (facultatif)" icon={<Phone />} type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} onBlur={blur('phone')} error={show('phone')} placeholder="+216 22 333 444" />
        <PasswordInput id="reg-password" label="Mot de passe" autoComplete="new-password" value={v.password} onChange={set('password')} onBlur={blur('password')} error={submitted ? errors.password : undefined} showRules />
        <PasswordInput id="reg-confirm" label="Confirmer le mot de passe" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} onBlur={blur('confirm')} error={show('confirm')}
          hint={v.confirm && v.confirm === v.password ? <span className="text-[#067647]">Les mots de passe correspondent.</span> : undefined} />
        <Button type="submit" size="lg" block loading={loading} className="!mt-6">{loading ? 'Création du compte…' : 'Créer mon compte'}</Button>
        <p className="text-center text-[12.5px] leading-relaxed text-[#8c8475]">
          En créant un compte, vous acceptez nos <Link href="/cgv" className="underline underline-offset-2">conditions</Link> et notre <Link href="/confidentialite" className="underline underline-offset-2">politique de confidentialité</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
