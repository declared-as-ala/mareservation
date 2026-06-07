'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';

function EmailVerifiedContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const { user } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleResend = async () => {
    setResending(true);
    setResendError(null);
    try {
      await apiFetch('/auth/resend-verification', { method: 'POST' });
      setResendDone(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Erreur lors du renvoi.');
    } finally {
      setResending(false);
    }
  };

  const isSuccess = success === 'true';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
      <div className={`absolute -top-40 -left-40 h-96 w-96 rounded-full blur-[120px] ${isSuccess ? 'bg-emerald-500/8' : 'bg-red-500/8'}`} />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/6 blur-[120px]" />

      <div className={`relative z-10 w-full max-w-md px-4 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

          {isSuccess ? (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="size-10 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Email vérifié !</h1>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités de Ma Reservation.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/explorer"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-sm hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Explorer les lieux
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.10] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all"
                >
                  Se connecter
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <XCircle className="size-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Lien expiré</h1>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Ce lien de vérification est invalide ou a expiré. Les liens sont valides pendant 24 heures.
              </p>

              {resendDone ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 mb-6 flex items-center gap-2 justify-center">
                  <CheckCircle2 className="size-4" />
                  Email de vérification envoyé !
                </div>
              ) : (
                <>
                  {resendError && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 mb-4 text-center">
                      {resendError}
                    </div>
                  )}
                  {user ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="w-full h-12 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 font-semibold text-sm hover:bg-amber-400/15 transition-all mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {resending ? <><Loader2 className="size-4 animate-spin" />Envoi...</> : <><Mail className="size-4" />Renvoyer l&apos;email de vérification</>}
                    </button>
                  ) : (
                    <p className="text-zinc-500 text-xs mb-4">Connectez-vous pour renvoyer l&apos;email de vérification.</p>
                  )}
                </>
              )}

              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-sm hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Retour à la connexion
              </Link>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          Besoin d&apos;aide ?{' '}
          <Link href="/contact" className="text-zinc-500 hover:text-zinc-400 underline transition-colors">
            Contactez-nous
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function EmailVerifiedPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="size-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
      </div>
    }>
      <EmailVerifiedContent />
    </Suspense>
  );
}
