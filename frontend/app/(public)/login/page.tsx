'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { resendVerificationPublic } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, Sparkles, Loader2 } from 'lucide-react';
import { resolvePostLoginRedirect } from '@/lib/auth/redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { isLoading: authLoading, isAuthenticated, role } = useAuth();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    router.replace(resolvePostLoginRedirect(role, returnTo));
  }, [authLoading, isAuthenticated, role, returnTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResendMessage(null);
    setLoading(true);
    try {
      const response = await login({ email, password });
      const { user, accessToken } = response as { user: typeof response.user; accessToken?: string };

      // Set Zustand state — backend set httpOnly cookies, and we also
      // persist the accessToken for Bearer fallback in case cross-port
      // cookies don't reach subsequent requests.
      setAuth(
        {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        accessToken
      );

      if (user.role === 'ADMIN') {
        router.replace(resolvePostLoginRedirect(user.role, returnTo));
      } else {
        router.replace(resolvePostLoginRedirect(user.role, returnTo));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connexion échouée';
      setError(msg);
      if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('verif')) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setResendMessage("Saisissez d'abord votre email.");
      return;
    }
    setResendLoading(true);
    setResendMessage(null);
    try {
      await resendVerificationPublic(email.trim().toLowerCase());
      setResendMessage('Email de vérification renvoyé. Vérifiez votre boîte mail.');
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Impossible d'envoyer l'email.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    authLoading ? (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/8 blur-[120px]" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-amber-400" />
          <p className="text-sm text-zinc-400">Vérification de la session...</p>
        </div>
      </div>
    ) : isAuthenticated ? (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-amber-400" />
          <p className="text-sm text-zinc-400">Connexion réussie — redirection…</p>
        </div>
      </div>
    ) : (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />

      {/* Ambient gold glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/8 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-amber-400/5 blur-[160px]" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating decorative elements */}
      <div className="absolute top-20 right-20 hidden lg:block">
        <Sparkles className="size-6 text-amber-400/20 animate-pulse" />
      </div>
      <div className="absolute bottom-32 left-24 hidden lg:block">
        <Sparkles className="size-5 text-amber-500/15 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Login Card */}
      <div
        className={`relative z-10 w-full max-w-md px-4 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
      >
        <Card className="border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 rounded-2xl overflow-hidden">
          {/* Subtle top border glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

          <CardHeader className="space-y-3 pb-6 pt-8 px-8">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20">
              <Lock className="size-6 text-amber-400" />
            </div>
            <CardTitle className="text-center text-2xl font-semibold tracking-tight text-white">
              Connexion
            </CardTitle>
            <CardDescription className="text-center text-sm text-neutral-400 leading-relaxed">
              Accédez à votre espace personnel Exploria360
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-8">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 text-center" role="alert">
                  {error}
                </div>
              )}
              {showResend && (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
                  <p className="mb-2 text-center">Veuillez vérifier votre email avant de vous connecter.</p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="w-full rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/15 disabled:opacity-60"
                  >
                    {resendLoading ? 'Envoi...' : 'Renvoyer l’email de vérification'}
                  </button>
                  {resendMessage && <p className="mt-2 text-center text-xs text-neutral-300">{resendMessage}</p>}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-300">
                  Adresse email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 pl-11 pr-4 rounded-xl border-white/[0.08] bg-white/[0.04] text-neutral-100 placeholder:text-neutral-600 focus-visible:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/20 focus-visible:ring-offset-0 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-neutral-300">
                    Mot de passe
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-amber-400/80 hover:text-amber-400 transition-colors duration-200 font-medium"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 pl-11 pr-14 rounded-xl border-white/[0.08] bg-white/[0.04] text-neutral-100 placeholder:text-neutral-600 focus-visible:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/20 focus-visible:ring-offset-0 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-all duration-200"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 px-8 pb-8 pt-2">
              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-semibold text-base hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>

              {/* Register Link */}
              <p className="text-center text-sm text-neutral-400">
                Pas encore de compte ?{' '}
                <Link
                  href="/register"
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Créer un compte
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Subtle bottom text */}
        <p className="mt-6 text-center text-xs text-neutral-600">
          En vous connectant, vous acceptez nos{' '}
          <Link href="/terms" className="text-neutral-500 hover:text-neutral-400 underline transition-colors">
            conditions d&apos;utilisation
          </Link>
        </p>
      </div>
    </div>
    )
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/8 blur-[120px]" />

        <div className="relative z-10 w-full max-w-md px-4">
          <Card className="border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 rounded-2xl">
            <CardHeader className="space-y-3 pb-6 pt-8 px-8">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20">
                <Lock className="size-6 text-amber-400" />
              </div>
              <CardTitle className="text-center text-2xl font-semibold tracking-tight text-white">
                Connexion
              </CardTitle>
              <CardDescription className="text-center text-sm text-neutral-400">
                Chargement...
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8">
              <div className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
