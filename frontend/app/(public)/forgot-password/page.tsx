'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return; }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/6 blur-[120px]" />

        <div className={`relative z-10 w-full max-w-md px-4 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/20">
              <CheckCircle2 className="size-10 text-amber-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Email envoyé !</h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-2">
              Si un compte existe avec l&apos;adresse{' '}
              <span className="text-zinc-200 font-medium">{email}</span>,
              vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
            </p>
            <p className="text-zinc-600 text-xs mb-8">
              Le lien expirera dans 1 heure. Vérifiez aussi vos spams.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.10] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all"
              >
                Réessayer avec un autre email
              </button>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-sm hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/8 blur-[120px]" />

      <div
        className={`relative z-10 w-full max-w-md px-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

          <div className="px-8 pt-8 pb-5 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20">
              <Mail className="size-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Mot de passe oublié ?</h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Saisissez votre email et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Adresse email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500 transition-colors group-focus-within:text-amber-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-base hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin" />Envoi en cours...</>
              ) : (
                'Envoyer le lien de réinitialisation'
              )}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200 group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Retour à la connexion
            </Link>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Vous vous souvenez de votre mot de passe ?{' '}
          <Link href="/login" className="text-zinc-500 hover:text-amber-400 transition-colors underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
