'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { resendVerificationPublic } from '@/lib/api/auth';

type Status = 'loading' | 'success' | 'error' | 'no-token';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!token) { setStatus('no-token'); return; }
    let isMounted = true;
    (async () => {
      try {
        const response = await apiFetch<{ message?: string }>('/auth/verify-email-token', {
          method: 'POST',
          body: { token },
        });
        if (!isMounted) return;
        setStatus('success');
        setMessage(response?.message || 'Votre adresse email a été vérifiée avec succès.');
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Ce lien de vérification est invalide ou a expiré.');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async () => {
    const email = searchParams.get('email');
    if (!email) {
      setResendMessage("Email manquant. Retournez sur la page de connexion pour renvoyer l'email.");
      return;
    }
    setResendLoading(true);
    setResendMessage('');
    try {
      await resendVerificationPublic(email);
      setResendMessage('Email de vérification renvoyé.');
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Impossible d'envoyer l'email.");
    } finally {
      setResendLoading(false);
    }
  };

  const content = {
    loading: {
      icon: <Loader2 className="size-10 text-amber-400 animate-spin" />,
      color: 'bg-amber-400/10 border-amber-400/20',
      title: 'Vérification en cours...',
      desc: 'Veuillez patienter pendant que nous vérifions votre adresse email.',
    },
    success: {
      icon: <CheckCircle2 className="size-10 text-emerald-400" />,
      color: 'bg-emerald-500/10 border-emerald-500/20',
      title: 'Email vérifié !',
      desc: message || 'Votre adresse email a été vérifiée avec succès.',
    },
    error: {
      icon: <XCircle className="size-10 text-red-400" />,
      color: 'bg-red-500/10 border-red-500/20',
      title: 'Lien invalide',
      desc: message || 'Ce lien de vérification est invalide ou a expiré.',
    },
    'no-token': {
      icon: <Mail className="size-10 text-zinc-500" />,
      color: 'bg-zinc-800/60 border-zinc-700',
      title: 'Lien manquant',
      desc: 'Aucun token de vérification trouvé. Veuillez utiliser le lien envoyé par email.',
    },
  }[status];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/8 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/6 blur-[120px]" />

      <div className={`relative z-10 w-full max-w-md px-4 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

          <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border ${content.color}`}>
            {content.icon}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{content.title}</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">{content.desc}</p>

          {(status === 'error' || status === 'no-token') && (
            <div className="flex flex-col gap-3">
              {status === 'error' && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm font-semibold hover:bg-amber-400/15 disabled:opacity-60"
                >
                  {resendLoading ? 'Envoi...' : "Renvoyer l'email de vérification"}
                </button>
              )}
              {resendMessage && (
                <p className="text-xs text-zinc-400">{resendMessage}</p>
              )}
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-sm hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Se connecter
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.10] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="size-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
