'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Check, X, Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {met ? <Check className="size-3 text-emerald-400 shrink-0" /> : <X className="size-3 text-zinc-600 shrink-0" />}
      <span className={met ? 'text-zinc-300' : 'text-zinc-600'}>{label}</span>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const strengthLabel = score >= 5 ? 'Fort' : score >= 4 ? 'Bon' : score >= 3 ? 'Moyen' : 'Faible';
  const strengthColor = score >= 5 ? 'bg-emerald-500' : score >= 4 ? 'bg-amber-400' : score >= 3 ? 'bg-amber-500' : 'bg-red-500';
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) { setError('Token de réinitialisation manquant. Veuillez demander un nouveau lien.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (score < 3) { setError('Le mot de passe est trop faible.'); return; }
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/8 blur-[120px]" />
        <div className="relative z-10 w-full max-w-md px-4 text-center">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <AlertCircle className="size-6 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Lien invalide</h1>
            <p className="text-zinc-400 text-sm mb-6">Ce lien de réinitialisation est invalide ou expiré.</p>
            <Link href="/forgot-password" className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-400 text-black font-semibold text-sm px-6 hover:bg-amber-300 transition-colors">
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="relative z-10 w-full max-w-md px-4 text-center">
          <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl p-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="size-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Mot de passe réinitialisé !</h1>
            <p className="text-zinc-400 text-sm mb-6">Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion.</p>
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-400 text-black font-semibold text-sm px-6 hover:bg-amber-300 transition-colors">
              Se connecter
            </Link>
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

          <div className="px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20">
              <KeyRound className="size-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Nouveau mot de passe</h1>
            <p className="mt-2 text-sm text-zinc-400">Choisissez un mot de passe fort et sécurisé</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {password && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(score / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 min-w-[40px]">{strengthLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <PasswordRequirement met={checks.length} label="8+ caractères" />
                    <PasswordRequirement met={checks.lowercase} label="Lettre minuscule" />
                    <PasswordRequirement met={checks.uppercase} label="Lettre majuscule" />
                    <PasswordRequirement met={checks.number} label="Chiffre" />
                    <PasswordRequirement met={checks.special} label="Caractère spécial" />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Répétez votre mot de passe"
                  autoComplete="new-password"
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border bg-white/[0.04] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all ${
                    confirmPassword && !passwordsMatch ? 'border-red-500/40' : confirmPassword && passwordsMatch ? 'border-emerald-500/40' : 'border-white/[0.08]'
                  } focus:border-amber-400/50`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-1.5 text-xs pt-0.5">
                  {passwordsMatch
                    ? <><Check className="size-3 text-emerald-400" /><span className="text-emerald-400">Les mots de passe correspondent</span></>
                    : <><X className="size-3 text-red-400" /><span className="text-red-400">Les mots de passe ne correspondent pas</span></>
                  }
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-base hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Réinitialisation...</> : 'Réinitialiser le mot de passe'}
            </button>

            <p className="text-center text-sm text-zinc-500">
              <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                ← Retour à la connexion
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="size-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
