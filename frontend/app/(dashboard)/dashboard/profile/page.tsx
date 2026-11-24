'use client';

/**
 * Customer account page (served at /profile). Light ivory & gold, real data only:
 * identity, reservation counts from /reservations/me, profile form and password change.
 */
import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { changePassword, updateMyProfile } from '@/lib/api/auth';
import { fetchMyReservations } from '@/lib/api/reservations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarCheck2, CalendarDays, ChevronRight, Clock3, Loader2, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type FieldErrors = {
  fullName?: string;
  phone?: string;
};

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function initialsFromName(name?: string, email?: string) {
  if (name?.trim()) {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (email ?? 'U').slice(0, 2).toUpperCase();
}

const fieldClass =
  'h-12 rounded-xl border-[#17140f]/12 bg-white dark:bg-white text-[#17140f] placeholder:text-[#9a9183] focus-visible:border-[#b07d12] focus-visible:ring-[#e0a527]/30';
const labelClass = 'text-sm font-medium text-[#3b362e]';
const cardClass = 'rounded-3xl border border-[#17140f]/10 bg-white p-5 shadow-[0_1px_0_rgba(23,20,15,0.04),0_10px_30px_rgba(23,20,15,0.05)] sm:p-7';
const primaryBtn = 'h-11 rounded-full bg-[#e0a527] px-6 font-semibold text-[#17140f] hover:bg-[#f0b93a] w-full sm:w-auto';

function Stat({ label, value, icon: Icon, href }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; href?: string }) {
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6ead0] text-[#8a5a00]">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-semibold tabular-nums leading-tight text-[#17140f]">{value}</span>
        <span className="block truncate text-xs text-[#847b6d]">{label}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-2xl border border-[#17140f]/10 bg-[#faf7f1] p-3.5';
  return href ? (
    <Link href={href} className={cn(cls, 'transition-colors hover:border-[#b07d12]/40')}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} className="text-xs font-medium text-red-700">{children}</p> : null;
}

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations', 'me'],
    queryFn: fetchMyReservations,
    enabled: !!user,
  });
  const counts = useMemo(() => {
    const list = reservations ?? [];
    const now = Date.now();
    const s = (r: (typeof list)[number]) => String(r.status ?? '').toUpperCase();
    return {
      upcoming: list.filter((r) => ['CONFIRMED', 'CHECKED_IN'].includes(s(r)) && new Date(r.endAt ?? r.startAt).getTime() >= now).length,
      pending: list.filter((r) => s(r) === 'PENDING').length,
    };
  }, [reservations]);

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedUser) => {
      setAuth({
        id: user?.id ?? updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
      });
      toast.success('Profil mis à jour.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil.';
      toast.error(message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(current, next),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Mot de passe modifié.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe.';
      toast.error(message);
    },
  });

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      nextErrors.fullName = 'Le nom complet doit contenir au moins 2 caractères.';
    }

    if (trimmedPhone && !/^[0-9+\s().-]{6,30}$/.test(trimmedPhone)) {
      nextErrors.phone = 'Numéro de téléphone invalide.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePassword = () => {
    const nextErrors: PasswordErrors = {};

    if (!currentPassword.trim()) nextErrors.currentPassword = 'Mot de passe actuel requis.';
    if (newPassword.length < 8) nextErrors.newPassword = 'Au moins 8 caractères.';
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';

    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    updateMutation.mutate({
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
    });
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePassword()) return;
    passwordMutation.mutate({ current: currentPassword, next: newPassword });
  };

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center px-4">
        <p className="flex items-center gap-2 text-sm text-[#5f584d]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Chargement de votre profil…
        </p>
      </div>
    );
  }

  const initials = initialsFromName(user.fullName, user.email);
  const roleLabel = user.role === 'ADMIN' ? 'Administrateur' : user.role === 'ESTABLISHMENT_OWNER' ? 'Hôte' : 'Voyageur';
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;
  const loadingValue = '…';

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      {/* Identity */}
      <section className={cardClass} aria-labelledby="profil-titre">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f0c25a] to-[#c98f14] text-xl font-bold text-[#17140f] shadow-[0_8px_20px_rgba(176,125,18,0.28)] sm:size-20 sm:text-2xl" aria-hidden="true">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5a00]">Mon compte</p>
            <h1 id="profil-titre" className="truncate font-serif text-[clamp(1.6rem,4vw,2.2rem)] leading-tight text-[#17140f]">{user.fullName}</h1>
            <p className="truncate text-sm text-[#5f584d]">{user.email}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6ead0] px-3 py-1 text-xs font-semibold text-[#6f4700]">
            <UserRound className="size-3.5" aria-hidden="true" /> {roleLabel}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              user.emailVerified ? 'bg-emerald-100 text-emerald-900' : 'bg-[#17140f]/[0.06] text-[#5f584d]'
            )}
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {user.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Stat label="Séjours à venir" value={reservationsLoading ? loadingValue : String(counts.upcoming)} icon={CalendarCheck2} href="/mes-reservations" />
          <Stat label="Demandes en attente" value={reservationsLoading ? loadingValue : String(counts.pending)} icon={Clock3} href="/mes-reservations" />
          {memberSince && <Stat label="Membre depuis" value={memberSince} icon={CalendarDays} />}
        </div>

        <Link
          href="/mes-reservations"
          className="mt-4 flex items-center justify-between rounded-2xl border border-[#17140f]/10 px-4 py-3 text-sm font-semibold text-[#17140f] transition-colors hover:border-[#b07d12]/40 hover:bg-[#faf7f1]"
        >
          Voir mes réservations
          <ChevronRight className="size-4 text-[#8a5a00] rtl:rotate-180" aria-hidden="true" />
        </Link>
      </section>

      {/* Personal information */}
      <section className={cardClass} aria-labelledby="infos-titre">
        <h2 id="infos-titre" className="text-lg font-semibold text-[#17140f]">Informations personnelles</h2>
        <p className="mt-1 text-sm text-[#5f584d]">Utilisées par les hôtes pour vous contacter au sujet de vos séjours.</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="fullName" className={labelClass}>Nom complet</Label>
            <Input
              id="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom complet"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              className={fieldClass}
            />
            <FieldError id="fullName-error">{errors.fullName}</FieldError>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email" className={labelClass}>Email</Label>
              <Input id="email" type="email" value={user.email} disabled className={cn(fieldClass, 'bg-[#faf7f1] dark:bg-[#faf7f1] text-[#847b6d] disabled:opacity-100')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={labelClass}>Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+216 xx xxx xxx"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                className={fieldClass}
              />
              <FieldError id="phone-error">{errors.phone}</FieldError>
            </div>
          </div>

          <Button type="submit" className={primaryBtn} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </form>
      </section>

      {/* Password */}
      <section className={cardClass} aria-labelledby="mdp-titre">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6ead0] text-[#8a5a00]">
            <Lock className="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 id="mdp-titre" className="text-lg font-semibold text-[#17140f]">Mot de passe</h2>
            <p className="mt-1 text-sm text-[#5f584d]">Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.</p>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className={labelClass}>Mot de passe actuel</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              aria-invalid={!!passwordErrors.currentPassword}
              aria-describedby={passwordErrors.currentPassword ? 'currentPassword-error' : undefined}
              className={fieldClass}
            />
            <FieldError id="currentPassword-error">{passwordErrors.currentPassword}</FieldError>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className={labelClass}>Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={!!passwordErrors.newPassword}
                aria-describedby={passwordErrors.newPassword ? 'newPassword-error' : undefined}
                className={fieldClass}
              />
              <FieldError id="newPassword-error">{passwordErrors.newPassword}</FieldError>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={labelClass}>Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!passwordErrors.confirmPassword}
                aria-describedby={passwordErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                className={fieldClass}
              />
              <FieldError id="confirmPassword-error">{passwordErrors.confirmPassword}</FieldError>
            </div>
          </div>

          <Button type="submit" className={primaryBtn} disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Mise à jour…
              </>
            ) : (
              'Mettre à jour le mot de passe'
            )}
          </Button>
        </form>
      </section>
    </div>
  );
}
