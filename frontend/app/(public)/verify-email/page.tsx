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
      icon: <Loader2 className="size-10 animate-spin text-[#b07d12]" />,
      color: 'bg-[#f6ead0] border-[#ecd9ad]',
      title: 'Vérification en cours...',
      desc: 'Veuillez patienter pendant que nous vérifions votre adresse email.',
    },
    success: {
      icon: <CheckCircle2 className="size-10 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200',
      title: 'Email vérifié !',
      desc: message || 'Votre adresse email a été vérifiée avec succès.',
    },
    error: {
      icon: <XCircle className="size-10 text-red-600" />,
      color: 'bg-red-50 border-red-200',
      title: 'Lien invalide',
      desc: message || 'Ce lien de vérification est invalide ou a expiré.',
    },
    'no-token': {
      icon: <Mail className="size-10 text-[#8a5a00]" />,
      color: 'bg-[#f6ead0] border-[#ecd9ad]',
      title: 'Lien manquant',
      desc: 'Aucun token de vérification trouvé. Veuillez utiliser le lien envoyé par email.',
    },
  }[status];

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden py-14">
      
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-300/25 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-200/30 blur-[120px]" />

      <div className={`relative z-10 w-full max-w-md px-4 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="rounded-3xl border border-[#17140f]/10 bg-white p-7 shadow-[0_1px_0_rgba(23,20,15,0.04),0_18px_50px_rgba(23,20,15,0.08)] sm:p-9">
          

          <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border ${content.color}`}>
            {content.icon}
          </div>

          <h1 className="mb-2 font-serif text-[1.75rem] leading-tight text-[#17140f]">{content.title}</h1>
          <p className="mb-8 text-sm leading-relaxed text-[#5f584d]">{content.desc}</p>

          {(status === 'error' || status === 'no-token') && (
            <div className="flex flex-col gap-3">
              {status === 'error' && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#b07d12]/35 bg-[#fbf3e1] text-sm font-semibold text-[#6f4700] hover:bg-[#f6ead0] disabled:opacity-60"
                >
                  {resendLoading ? 'Envoi...' : "Renvoyer l'email de vérification"}
                </button>
              )}
              {resendMessage && (
                <p className="text-xs text-[#5f584d]" role="status">{resendMessage}</p>
              )}
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#e0a527] text-sm font-semibold text-[#17140f] shadow-[0_8px_20px_rgba(176,125,18,0.25)] transition-colors hover:bg-[#f0b93a]"
              >
                Se connecter
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#17140f]/12 text-sm font-medium text-[#3b362e] transition-colors hover:bg-[#17140f]/[0.04]"
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
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="size-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
