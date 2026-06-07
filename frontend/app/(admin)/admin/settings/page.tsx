'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchAdminSettings, updateAdminSettings } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Phone, Mail, ImageIcon, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type SettingsForm = {
  siteName: string;
  logoUrlLight: string;
  logoUrlDark: string;
  supportPhone: string;
  supportEmail: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
};

const defaultForm: SettingsForm = {
  siteName: '',
  logoUrlLight: '',
  logoUrlDark: '',
  supportPhone: '',
  supportEmail: '',
  defaultLanguage: 'fr',
  maintenanceMode: false,
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAdminSettings,
  });

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        siteName: data.siteName ?? '',
        logoUrlLight: data.logoUrlLight ?? '',
        logoUrlDark: data.logoUrlDark ?? '',
        supportPhone: data.supportPhone ?? '',
        supportEmail: data.supportEmail ?? '',
        defaultLanguage: data.defaultLanguage ?? 'fr',
        maintenanceMode: data.maintenanceMode ?? false,
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => updateAdminSettings({
      siteName: form.siteName || undefined,
      logoUrlLight: form.logoUrlLight || undefined,
      logoUrlDark: form.logoUrlDark || undefined,
      supportPhone: form.supportPhone || undefined,
      supportEmail: form.supportEmail || undefined,
      defaultLanguage: form.defaultLanguage || undefined,
      maintenanceMode: form.maintenanceMode,
    }),
    onSuccess: () => {
      toast.success('Paramètres enregistrés');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const field = (key: keyof SettingsForm) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-400">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Paramètres</h1>
            <Settings className="size-5 text-zinc-400" />
          </div>
          <p className="mt-1 text-sm text-zinc-400">Configuration générale du site</p>
        </div>
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="gap-2 min-w-[140px] bg-amber-500 text-black hover:bg-amber-400 transition-all duration-200"
        >
          {saveMut.isPending ? (
            <><Loader2 className="size-4 animate-spin" />Sauvegarde...</>
          ) : saved ? (
            <><CheckCircle2 className="size-4" />Sauvegardé</>
          ) : (
            <><Save className="size-4" />Sauvegarder</>
          )}
        </Button>
      </div>

      {/* General */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Globe className="size-4 text-amber-400" />
            Informations générales
          </CardTitle>
          <CardDescription className="text-zinc-400">Nom du site et paramètres de base</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName" className="text-zinc-300">Nom du site</Label>
              <Input 
                id="siteName" 
                placeholder="MaTable" 
                {...field('siteName')} 
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultLanguage" className="text-zinc-300">Langue par défaut</Label>
              <Input 
                id="defaultLanguage" 
                placeholder="fr" 
                {...field('defaultLanguage')} 
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <ImageIcon className="size-4 text-amber-400" />
            Logos
          </CardTitle>
          <CardDescription className="text-zinc-400">URLs des logos light et dark mode</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="logoLight" className="text-zinc-300">Logo (mode clair)</Label>
              <Input 
                id="logoLight" 
                placeholder="https://..." 
                {...field('logoUrlLight')} 
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
              {form.logoUrlLight && (
                <div className="mt-3 p-4 rounded-lg border border-zinc-700 bg-white flex items-center justify-center h-16 relative overflow-hidden">
                  <Image src={form.logoUrlLight} alt="Logo light" fill className="object-contain p-2" sizes="200px" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="logoDark" className="text-zinc-300">Logo (mode sombre)</Label>
              <Input 
                id="logoDark" 
                placeholder="https://..." 
                {...field('logoUrlDark')} 
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
              {form.logoUrlDark && (
                <div className="mt-3 p-4 rounded-lg border border-zinc-700 bg-zinc-900 flex items-center justify-center h-16 relative overflow-hidden">
                  <Image src={form.logoUrlDark} alt="Logo dark" fill className="object-contain p-2" sizes="200px" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Phone className="size-4 text-amber-400" />
            Contact support
          </CardTitle>
          <CardDescription className="text-zinc-400">Coordonnées affichées aux utilisateurs</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supportPhone" className="flex items-center gap-1.5 text-zinc-300">
                <Phone className="size-3.5" /> Téléphone support
              </Label>
              <Input 
                id="supportPhone" 
                placeholder="+216 XX XXX XXX" 
                {...field('supportPhone')} 
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail" className="flex items-center gap-1.5 text-zinc-300">
                <Mail className="size-3.5" /> Email support
              </Label>
              <Input 
                id="supportEmail" 
                type="email" 
                placeholder="support@matable.tn" 
                {...field('supportEmail')} 
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Settings className="size-4 text-amber-400" />
            Mode maintenance
          </CardTitle>
          <CardDescription className="text-zinc-400">
            En mode maintenance, seuls les admins peuvent accéder au site
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-4 bg-zinc-800/30">
            <div>
              <p className="text-sm font-medium text-zinc-200">Activer le mode maintenance</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {form.maintenanceMode
                  ? 'Le site est actuellement en maintenance'
                  : 'Le site est accessible au public'}
              </p>
            </div>
            <Switch
              checked={form.maintenanceMode}
              onCheckedChange={(v) => setForm((f) => ({ ...f, maintenanceMode: v }))}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Bottom save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="gap-2 bg-amber-500 text-black hover:bg-amber-400 transition-all duration-200"
        >
          {saveMut.isPending ? (
            <><Loader2 className="size-4 animate-spin" />Sauvegarde...</>
          ) : saved ? (
            <><CheckCircle2 className="size-4" />Sauvegardé</>
          ) : (
            <><Save className="size-4" />Sauvegarder les paramètres</>
          )}
        </Button>
      </div>
    </div>
  );
}
