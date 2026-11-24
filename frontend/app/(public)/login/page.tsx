'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { login, resendVerificationPublic } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { resolvePostLoginRedirect } from '@/lib/auth/redirect';
import { Alert, Button, Field, PasswordInput } from '@/components/ds';
import { AuthLayout } from '@/components/ds/AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function LoginForm() {
  const router = useRouter();
  const returnTo = useSearchParams().get('returnTo');
  const { isLoading: authLoading, isAuthenticated, role } = useAuth();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  // Already signed in → go where this role belongs.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    router.replace(resolvePostLoginRedirect(role, returnTo));
  }, [authLoading, isAuthenticated, role, returnTo, router]);

  const emailErr = submitted && !EMAIL_RE.test(email.trim()) ? 'Adresse e-mail invalide.' : undefined;
  const pwdErr = submitted && !password ? 'Saisissez votre mot de passe.' : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setNeedsVerify(false);
    setResendMsg(null);
    if (!EMAIL_RE.test(email.trim()) || !password || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res: any = await login({ email: email.trim().toLowerCase(), password });
      const user = res.user;
      setAuth({ id: user.id ?? user._id, fullName: user.fullName, email: user.email, role: user.role, emailVerified: user.emailVerified }, res.accessToken);
      router.replace(resolvePostLoginRedirect(user.role, returnTo));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connexion impossible.';
      setError(msg);
      if (/verif/i.test(msg)) setNeedsVerify(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  async function resend() {
    setResendMsg(null);
    try {
      await resendVerificationPublic(email.trim().toLowerCase());
      setResendMsg('E-mail de vérification renvoyé.');
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : "Envoi impossible.");
    }
  }

  return (
    <AuthLayout
      title="Bon retour parmi nous"
      subtitle="Connectez-vous pour gérer vos réservations — ou votre maison d’hôtes."
      footer={<>Pas encore de compte ? <Link href={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="font-semibold text-[#17140f] underline-offset-4 hover:underline">Créer un compte</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && (
          <Alert onClose={() => setError(null)}>
            {error}
            {needsVerify && (
              <button type="button" onClick={resend} className="mt-1 block font-semibold underline underline-offset-2">Renvoyer l’e-mail de vérification</button>
            )}
            {resendMsg && <span className="mt-1 block">{resendMsg}</span>}
          </Alert>
        )}
        <Field id="login-email" label="E-mail" icon={<Mail />} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailErr} placeholder="vous@exemple.com" autoFocus />
        <div>
          <PasswordInput id="login-password" label="Mot de passe" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={pwdErr} />
          <div className="mt-2 flex justify-end">
            <Link href="/forgot-password" className="text-[13px] font-medium text-[#6f6758] underline-offset-4 hover:text-[#17140f] hover:underline">Mot de passe oublié ?</Link>
          </div>
        </div>
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Connexion…' : 'Se connecter'}</Button>
        <p className="text-center text-[12.5px] text-[#8c8475]">Clients, propriétaires et administrateurs utilisent ce même accès.</p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
