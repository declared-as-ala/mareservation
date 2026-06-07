'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { changePassword, updateMyProfile } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Settings2,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
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

function AccountStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 px-4 py-4">
      <div className="flex size-11 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function SideInfoCard({
  icon: Icon,
  title,
  description,
  cta,
  accent = 'text-amber-300',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(10,10,11,0.96))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-start gap-3">
        <div className={cn('flex size-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/90', accent)}>
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 transition-colors hover:text-amber-200"
      >
        {cta}
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
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
      toast.success('Profil mis a jour avec succes.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise a jour du profil.';
      toast.error(message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(current, next),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Mot de passe modifie avec succes.');
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
      nextErrors.fullName = 'Le nom complet doit contenir au moins 2 caracteres.';
    }

    if (trimmedPhone && !/^[0-9+\s().-]{6,30}$/.test(trimmedPhone)) {
      nextErrors.phone = 'Numero de telephone invalide.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePassword = () => {
    const nextErrors: PasswordErrors = {};

    if (!currentPassword.trim()) nextErrors.currentPassword = 'Mot de passe actuel requis.';
    if (newPassword.length < 8) nextErrors.newPassword = 'Le nouveau mot de passe doit contenir au moins 8 caracteres.';
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
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <p className="text-sm text-zinc-400">Chargement de votre profil...</p>
      </div>
    );
  }

  const initials = initialsFromName(user.fullName, user.email);
  const roleLabel = user.role === 'ADMIN' ? 'Administrateur' : 'Client';
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : 'ce mois';

  return (
    <div className="space-y-6">
      <div>
        <div className="h-1 w-12 rounded-full bg-amber-400" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-100">Parametres du compte</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Gerez vos informations personnelles, la securite de votre compte et vos preferences.
        </p>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-amber-400/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_26%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)] lg:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-24 items-center justify-center rounded-full border-4 border-amber-300/20 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-3xl font-bold text-black shadow-[0_16px_36px_rgba(212,175,55,0.4)]">
                  {initials}
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-zinc-100">{user.fullName}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-300">
                      <UserRound className="mr-1 size-3.5" />
                      {roleLabel}
                    </Badge>
                    <Badge
                      className={cn(
                        'px-3 py-1',
                        user.emailVerified
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                      )}
                    >
                      <ShieldCheck className="mr-1 size-3.5" />
                      {user.emailVerified ? 'Email verifie' : 'Verification en attente'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15 hover:text-amber-100"
              >
                Modifier le profil
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <AccountStat label="Reservations ce mois" value="24" icon={CalendarDays} />
              <AccountStat label="Favoris enregistres" value="12" icon={MapPin} />
              <AccountStat label="Membre depuis" value={memberSince} icon={ShieldCheck} />
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-800/80 bg-zinc-950/70 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-amber-300">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Securite du compte</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Protegez votre compte et gardez le controle sur vos acces.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Email</p>
                  <p className="text-xs text-zinc-500">
                    {user.emailVerified ? 'Verification active' : 'Verification recommandee'}
                  </p>
                </div>
                <Mail className="size-4 text-zinc-500" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Mot de passe</p>
                  <p className="text-xs text-zinc-500">Mettre a jour regulierement</p>
                </div>
                <Lock className="size-4 text-zinc-500" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Telephone</p>
                  <p className="text-xs text-zinc-500">{user.phone?.trim() ? user.phone : 'A renseigner'}</p>
                </div>
                <Smartphone className="size-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="informations" className="space-y-5">
        <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b border-zinc-800 bg-transparent p-0">
          <TabsTrigger
            value="informations"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
          >
            Informations
          </TabsTrigger>
          <TabsTrigger
            value="securite"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
          >
            Securite
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
          >
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="informations" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <section className="rounded-[28px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-zinc-100">Informations personnelles</h2>
                <p className="mt-1 text-sm text-zinc-500">Mettez a jour vos informations personnelles.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-zinc-300">
                    Nom complet
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="h-12 border-zinc-800 bg-zinc-950/80 text-zinc-100"
                  />
                  {errors.fullName ? <p className="text-xs text-red-400">{errors.fullName}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="h-12 border-zinc-800 bg-zinc-900/70 text-zinc-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-zinc-300">
                      Telephone
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+216 xx xxx xxx"
                      className="h-12 border-zinc-800 bg-zinc-950/80 text-zinc-100"
                    />
                    {errors.phone ? <p className="text-xs text-red-400">{errors.phone}</p> : null}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="min-w-[220px] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-black hover:from-amber-200 hover:to-amber-400"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer les modifications'
                  )}
                </Button>
              </form>
            </section>

            <div className="space-y-5">
              <SideInfoCard
                icon={ShieldCheck}
                title="Securite du compte"
                description="Protegez votre compte et gerez votre securite."
                cta="Voir toutes les options de securite"
              />
              <SideInfoCard
                icon={CalendarDays}
                title="Activite recente"
                description="Votre espace vient d'etre consulte sur cette session. D'autres journaux d'activite peuvent etre ajoutes ensuite."
                cta="Voir plus d'activites"
                accent="text-emerald-300"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="securite" className="mt-0">
          <section className="max-w-3xl rounded-[28px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">Changer le mot de passe</h2>
              <p className="mt-1 text-sm text-zinc-500">Renforcez la securite de votre compte.</p>
            </div>

            <form className="space-y-5" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-zinc-300">
                  Mot de passe actuel
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 border-zinc-800 bg-zinc-950/80 text-zinc-100"
                />
                {passwordErrors.currentPassword ? <p className="text-xs text-red-400">{passwordErrors.currentPassword}</p> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-zinc-300">
                    Nouveau mot de passe
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 border-zinc-800 bg-zinc-950/80 text-zinc-100"
                  />
                  {passwordErrors.newPassword ? <p className="text-xs text-red-400">{passwordErrors.newPassword}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-zinc-300">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 border-zinc-800 bg-zinc-950/80 text-zinc-100"
                  />
                  {passwordErrors.confirmPassword ? <p className="text-xs text-red-400">{passwordErrors.confirmPassword}</p> : null}
                </div>
              </div>

              <Button
                type="submit"
                className="min-w-[240px] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-black hover:from-amber-200 hover:to-amber-400"
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Mise a jour...
                  </>
                ) : (
                  'Mettre a jour le mot de passe'
                )}
              </Button>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <section className="max-w-3xl rounded-[28px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-amber-300">
                <Bell className="size-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">Notifications</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Cette section peut accueillir les preferences email, rappels et alertes de reservation.
                </p>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
          <section className="max-w-3xl rounded-[28px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-amber-300">
                <Settings2 className="size-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">Preferences</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Cette section peut etre etendue avec la langue, les habitudes de reservation et les choix d'affichage.
                </p>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
