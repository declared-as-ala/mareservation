'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, User, Mail, Phone, Lock, Sparkles, Loader2, Check, X } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };

    Object.values(checks).forEach(pass => { if (pass) score++; });

    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (score >= 5) strength = 'strong';
    else if (score >= 4) strength = 'good';
    else if (score >= 3) strength = 'fair';

    return { score, strength, checks };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsDontMatch = confirmPassword && password !== confirmPassword;

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-amber-500',
    good: 'bg-amber-400',
    strong: 'bg-emerald-500',
  };

  const strengthLabels = {
    weak: 'Faible',
    fair: 'Moyen',
    good: 'Bon',
    strong: 'Fort',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      const { user, accessToken } = response as { user: typeof response.user; accessToken?: string };

      // Set Zustand state — backend set httpOnly cookies; we also persist
      // the accessToken as a Bearer fallback for cross-port deployments.
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

      toast.success('Compte créé ! Vérifiez votre email pour activer votre compte.', { duration: 6000 });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
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

      {/* Signup Card */}
      <div
        className={`relative z-10 w-full max-w-md px-4 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
      >
        <Card className="border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 rounded-2xl overflow-hidden">
          {/* Subtle top border glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

          <CardHeader className="space-y-3 pb-6 pt-8 px-8">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20">
              <User className="size-6 text-amber-400" />
            </div>
            <CardTitle className="text-center text-2xl font-semibold tracking-tight text-white">
              Inscription
            </CardTitle>
            <CardDescription className="text-center text-sm text-neutral-400 leading-relaxed">
              Créez votre compte Ma Reservation
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-8">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 text-center" role="alert">
                  {error}
                </div>
              )}

              {/* Full Name Field */}
              <div className="space-y-2.5">
                <Label htmlFor="fullName" className="text-sm font-medium text-neutral-300">
                  Nom complet
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-12 pl-11 pr-4 rounded-xl border-white/[0.08] bg-white/[0.04] text-neutral-100 placeholder:text-neutral-600 focus-visible:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/20 focus-visible:ring-offset-0 transition-all duration-200"
                  />
                </div>
              </div>

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

              {/* Phone Field */}
              <div className="space-y-2.5">
                <Label htmlFor="phone" className="text-sm font-medium text-neutral-300">
                  Téléphone <span className="text-neutral-500 font-normal">(optionnel)</span>
                </Label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+216 12 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    className="h-12 pl-11 pr-4 rounded-xl border-white/[0.08] bg-white/[0.04] text-neutral-100 placeholder:text-neutral-600 focus-visible:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/20 focus-visible:ring-offset-0 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-300">
                  Mot de passe
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
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

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strengthColors[passwordStrength.strength]}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.strength === 'strong' ? 'text-emerald-400' :
                          passwordStrength.strength === 'good' ? 'text-amber-400' :
                            passwordStrength.strength === 'fair' ? 'text-amber-500' :
                              'text-red-400'
                        }`}>
                        {strengthLabels[passwordStrength.strength]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { check: passwordStrength.checks.length, label: '8+ caractères' },
                        { check: passwordStrength.checks.lowercase, label: 'Lettre minuscule' },
                        { check: passwordStrength.checks.uppercase, label: 'Lettre majuscule' },
                        { check: passwordStrength.checks.number, label: 'Chiffre' },
                        { check: passwordStrength.checks.special, label: 'Caractère spécial' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          {item.check ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <X className="size-3 text-neutral-600" />
                          )}
                          <span className={item.check ? 'text-neutral-300' : 'text-neutral-600'}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-300">
                  Confirmer le mot de passe
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`h-12 pl-11 pr-14 rounded-xl border-white/[0.08] bg-white/[0.04] text-neutral-100 placeholder:text-neutral-600 focus-visible:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/20 focus-visible:ring-offset-0 transition-all duration-200 ${passwordsDontMatch ? 'border-red-500/50' : ''
                      } ${passwordsMatch ? 'border-emerald-500/50' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-all duration-200"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 pt-1">
                    {passwordsMatch ? (
                      <>
                        <Check className="size-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Les mots de passe correspondent</span>
                      </>
                    ) : passwordsDontMatch ? (
                      <>
                        <X className="size-4 text-red-400" />
                        <span className="text-xs text-red-400">Les mots de passe ne correspondent pas</span>
                      </>
                    ) : null}
                  </div>
                )}
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
                    Inscription en cours...
                  </>
                ) : (
                  'Créer un compte'
                )}
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-neutral-400">
                Déjà un compte ?{' '}
                <Link
                  href="/login"
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Se connecter
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Subtle bottom text */}
        <p className="mt-6 text-center text-xs text-neutral-600">
          En créant un compte, vous acceptez nos{' '}
          <Link href="/terms" className="text-neutral-500 hover:text-neutral-400 underline transition-colors">
            conditions d&apos;utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}
