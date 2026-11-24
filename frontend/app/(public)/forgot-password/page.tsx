'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Mail, MailCheck } from 'lucide-react';
import { forgotPassword } from '@/lib/api/auth';
import { Alert, Button, Field } from '@/components/ds';
import { AuthLayout } from '@/components/ds/AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const invalid = submitted && !EMAIL_RE.test(email.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!EMAIL_RE.test(email.trim()) || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible. Réessayez.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={sent ? 'Vérifiez votre boîte mail' : 'Mot de passe oublié'}
      subtitle={sent ? undefined : 'Indiquez l’e-mail de votre compte : nous vous envoyons un lien sécurisé, valable 2 heures.'}
      footer={<Link href="/login" className="font-semibold text-[#17140f] underline-offset-4 hover:underline">Retour à la connexion</Link>}
    >
      {sent ? (
        <div className="ex-fade-up space-y-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#ecfdf3] text-[#067647]"><MailCheck className="size-6" aria-hidden="true" /></div>
          <p className="text-[15px] leading-relaxed text-[#3b362e]">Si un compte existe pour <strong>{email.trim()}</strong>, un lien de réinitialisation vient d’être envoyé. Pensez à vérifier les indésirables.</p>
          <Button variant="secondary" block onClick={() => { setSent(false); setSubmitted(false); }}>Utiliser une autre adresse</Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert onClose={() => setError(null)}>{error}</Alert>}
          <Field id="fp-email" label="E-mail" icon={<Mail />} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={invalid ? 'Adresse e-mail invalide.' : undefined} placeholder="vous@exemple.com" autoFocus />
          <Button type="submit" size="lg" block loading={loading}>Envoyer le lien</Button>
        </form>
      )}
    </AuthLayout>
  );
}
