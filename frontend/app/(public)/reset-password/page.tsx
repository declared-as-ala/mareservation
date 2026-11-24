'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/lib/api/auth';
import { Alert, Button, ButtonLink, PasswordInput, passwordIsStrong } from '@/components/ds';
import { AuthLayout } from '@/components/ds/AuthLayout';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const pwdErr = submitted && !passwordIsStrong(password) ? 'Le mot de passe ne respecte pas toutes les exigences.' : undefined;
  const confErr = submitted && confirm !== password ? 'Les mots de passe ne correspondent pas.' : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!passwordIsStrong(password) || confirm !== password || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Lien invalide" subtitle="Ce lien de réinitialisation est incomplet ou a expiré.">
        <ButtonLink href="/forgot-password" size="lg" className="w-full">Demander un nouveau lien</ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={done ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
      subtitle={done ? undefined : 'Choisissez un mot de passe solide. Toutes vos sessions ouvertes seront fermées.'}
      footer={!done && <Link href="/login" className="font-semibold text-[#17140f] underline-offset-4 hover:underline">Retour à la connexion</Link>}
    >
      {done ? (
        <div className="ex-fade-up space-y-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#ecfdf3] text-[#067647]"><CheckCircle2 className="size-6" aria-hidden="true" /></div>
          <p className="text-[15px] text-[#3b362e]">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <ButtonLink href="/login" size="lg" className="w-full">Se connecter</ButtonLink>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert onClose={() => setError(null)}>{error}{/expir|invalide/i.test(error) && <> — <Link href="/forgot-password" className="font-semibold underline">nouveau lien</Link></>}</Alert>}
          <PasswordInput id="rp-password" label="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={pwdErr} showRules autoFocus />
          <PasswordInput id="rp-confirm" label="Confirmer" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confErr} />
          <Button type="submit" size="lg" block loading={loading}>Enregistrer le mot de passe</Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
