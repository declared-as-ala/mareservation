import { Search, CalendarCheck, PartyPopper, ShieldCheck, Clock, Headphones } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Explorez les lieux',
    description:
      'Parcourez notre sélection de restaurants, cafés, hôtels et espaces événementiels. Filtrez par ville, type d\'établissement ou disponibilité.',
    color: 'from-amber-400 to-amber-600',
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Choisissez votre table',
    description:
      'Sélectionnez votre table en temps réel grâce à notre vue 360° interactive. Voyez instantanément les tables disponibles ou réservées.',
    color: 'from-emerald-400 to-emerald-600',
  },
  {
    number: '03',
    icon: PartyPopper,
    title: 'Confirmez et profitez',
    description:
      'Recevez votre confirmation par email avec un code unique. Le jour J, présentez-vous et profitez de votre expérience.',
    color: 'from-blue-400 to-blue-600',
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Réservation sécurisée',
    description: 'Vos données sont protégées. Paiement sécurisé et confirmation instantanée.',
  },
  {
    icon: Clock,
    title: 'Disponibilité en temps réel',
    description: 'Consultez les disponibilités à la minute près, sans surprise le jour de votre visite.',
  },
  {
    icon: Headphones,
    title: 'Support 7j/7',
    description: 'Notre équipe est disponible pour vous aider à toute heure via chat ou téléphone.',
  },
];

const faqs = [
  {
    q: 'Est-ce gratuit pour les utilisateurs ?',
    a: 'Oui, MaTable est entièrement gratuit pour les clients. Aucun frais de réservation n\'est appliqué.',
  },
  {
    q: 'Puis-je annuler ma réservation ?',
    a: 'Vous pouvez annuler votre réservation depuis votre tableau de bord jusqu\'à 2 heures avant l\'heure prévue.',
  },
  {
    q: 'Comment fonctionne la vue 360° ?',
    a: 'Certains établissements proposent une visite virtuelle de leur espace. Vous pouvez y voir les tables disponibles et choisir la vôtre directement.',
  },
  {
    q: 'Je suis propriétaire d\'un établissement, comment m\'inscrire ?',
    a: 'Rendez-vous sur notre page dédiée aux établissements ou contactez-nous directement pour découvrir nos offres.',
  },
];

export default function CommentCaMarchePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300 mb-6">
            Comment ça marche
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Réserver n&apos;a jamais été aussi{' '}
            <span className="text-amber-400">simple</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-xl mx-auto">
            En quelques clics, trouvez et réservez la table parfaite dans les meilleurs établissements de votre ville.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/explorer"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold text-sm hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25"
            >
              Explorer les lieux
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">3 étapes pour réserver</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Un processus simple et rapide conçu pour que vous profitiez au maximum de votre expérience.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative rounded-2xl border bg-card p-8 hover:shadow-lg transition-shadow"
                >
                  <div className={`inline-flex size-12 rounded-xl bg-gradient-to-br ${step.color} items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="size-6 text-white" />
                  </div>
                  <div className="absolute top-6 right-6 text-5xl font-black text-muted-foreground/10 leading-none select-none">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-10">Pourquoi choisir MaTable ?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex gap-4 p-6 rounded-xl bg-card border">
                  <div className="size-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-black text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à commencer ?</h2>
          <p className="text-neutral-400 mb-8">
            Rejoignez des milliers d&apos;utilisateurs qui réservent leurs tables en toute simplicité.
          </p>
          <Link
            href="/register"
            className="inline-flex px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold hover:from-amber-300 hover:to-amber-400 transition-all shadow-xl shadow-amber-500/30"
          >
            Créer mon compte gratuitement
          </Link>
        </div>
      </section>
    </div>
  );
}
