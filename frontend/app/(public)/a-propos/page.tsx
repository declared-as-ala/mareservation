import { MapPin, Users, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { icon: MapPin, value: '500+', label: 'Établissements partenaires' },
  { icon: Users, value: '50 000+', label: 'Utilisateurs satisfaits' },
  { icon: Star, value: '4.8/5', label: 'Note moyenne' },
  { icon: TrendingUp, value: '200 000+', label: 'Réservations effectuées' },
];

const values = [
  {
    title: 'Excellence',
    description: 'Nous sélectionnons soigneusement les établissements partenaires pour vous garantir une expérience de qualité à chaque réservation.',
  },
  {
    title: 'Simplicité',
    description: 'Notre interface intuitive vous permet de trouver et réserver une table en moins d\'une minute, depuis n\'importe quel appareil.',
  },
  {
    title: 'Transparence',
    description: 'Prix clairs, disponibilités en temps réel, aucune mauvaise surprise. Ce que vous voyez est exactement ce que vous obtenez.',
  },
  {
    title: 'Innovation',
    description: 'Grâce à notre technologie de visite virtuelle 360°, découvrez les espaces avant même d\'y mettre les pieds.',
  },
];

const team = [
  { name: 'Aziz Bensalah', role: 'Co-fondateur & CEO', initials: 'AB' },
  { name: 'Sara Trabelsi', role: 'Co-fondatrice & CTO', initials: 'ST' },
  { name: 'Karim Mansour', role: 'Directeur Produit', initials: 'KM' },
  { name: 'Leila Khadri', role: 'Responsable Partenariats', initials: 'LK' },
];

export default function AProposPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black py-28 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300 mb-6">
            À propos de MaTable
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            Nous réinventons l&apos;art de{' '}
            <span className="text-amber-400">réserver</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            MaTable est la plateforme de référence pour découvrir et réserver les meilleurs établissements
            en Tunisie. Notre mission : connecter les amoureux de bonne cuisine et de belles expériences
            avec les lieux qui les méritent.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-black border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="inline-flex size-10 rounded-xl bg-amber-400/10 items-center justify-center mb-3">
                  <Icon className="size-5 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-xs text-neutral-400 font-medium">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-5">Notre histoire</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                <p>
                  MaTable est né d&apos;un constat simple : trouver et réserver une table dans un bon
                  restaurant était encore trop compliqué. Des appels téléphoniques sans réponse,
                  des disponibilités floues, des surprises le jour J.
                </p>
                <p>
                  En 2024, notre équipe a décidé de changer cela. Nous avons créé une plateforme qui
                  centralise l&apos;offre de restauration et d&apos;hébergement, avec des disponibilités
                  en temps réel et une expérience de réservation fluide et moderne.
                </p>
                <p>
                  Aujourd&apos;hui, MaTable est présent dans les principales villes tunisiennes et
                  continue de s&apos;étendre pour offrir à chacun la meilleure expérience possible.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/5 border border-amber-400/10 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🍽️</div>
                  <p className="text-amber-400/70 text-sm font-medium">
                    Fondée en 2024 à Tunis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Nos valeurs</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Ce qui nous guide au quotidien dans tout ce que nous faisons.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <div key={v.title} className="rounded-2xl border bg-card p-8">
                <div className="size-9 rounded-lg bg-amber-400/10 flex items-center justify-center mb-4">
                  <span className="text-amber-400 font-black text-sm">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Notre équipe</h2>
            <p className="text-muted-foreground text-sm">
              Une équipe passionnée dédiée à révolutionner la réservation en Tunisie.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/15 flex items-center justify-center mx-auto mb-3 text-lg font-black text-amber-400">
                  {member.initials}
                </div>
                <h3 className="font-semibold text-sm">{member.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-black text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Rejoignez l&apos;aventure MaTable
          </h2>
          <p className="text-neutral-400 mb-8 text-sm">
            Que vous soyez un utilisateur ou un établissement, nous avons une place pour vous.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold text-sm hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25"
            >
              Créer un compte
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
