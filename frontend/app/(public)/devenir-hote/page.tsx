import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, BellRing, CalendarRange, Camera, CheckCircle2, Eye, KeyRound, Rotate3d, ShieldCheck, Wallet } from 'lucide-react';
import { HostApplicationForm } from './HostApplicationForm';
import { jsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: "Devenir hôte — mettez votre maison d'hôtes en ligne",
  description:
    "Faites visiter votre maison d'hôtes en 360°, gérez votre calendrier et recevez des réservations directement avec Exploria360.",
  alternates: { canonical: '/devenir-hote' },
};

const WHY = [
  { icon: Rotate3d, title: 'Visite 360° immersive', text: 'Vos futurs hôtes parcourent chaque pièce avant de réserver : moins d’hésitation, plus de confiance.' },
  { icon: CalendarRange, title: 'Calendrier en temps réel', text: 'Bloquez des dates, ajoutez vos réservations téléphone ou WhatsApp : le site se met à jour instantanément.' },
  { icon: BellRing, title: 'Demandes ou réservation instantanée', text: 'Confirmez chaque demande, ou laissez les réservations se confirmer automatiquement : à vous de choisir.' },
  { icon: Wallet, title: 'Vos tarifs, vos règles', text: 'Prix par nuit, saisons, frais de ménage, séjour minimum, conditions d’annulation : tout est configurable.' },
  { icon: ShieldCheck, title: 'Aucune double réservation', text: 'Le moteur de réservation protège chaque nuit, même si deux voyageurs réservent à la même seconde.' },
  { icon: Eye, title: 'Une vitrine premium', text: 'Une fiche élégante, référencée, mise en avant sur la carte de la Tunisie et dans nos sélections.' },
];

const STEPS = [
  { n: '01', title: 'Candidature', text: 'Remplissez le formulaire ci-dessous : il ne prend que deux minutes.' },
  { n: '02', title: 'Visite & tournage 360°', text: 'Nous échangeons avec vous et réalisons (ou intégrons) la visite virtuelle de votre maison.' },
  { n: '03', title: 'Votre espace propriétaire', text: 'Vous recevez un lien personnel et sécurisé pour créer votre mot de passe.' },
  { n: '04', title: 'En ligne', text: 'Votre maison est publiée : vous gérez calendrier, tarifs et réservations depuis votre tableau de bord.' },
];

const FAQ = [
  { q: 'Combien coûte l’inscription ?', a: 'Contactez-nous : les conditions sont présentées lors de notre premier échange, avant tout engagement.' },
  { q: 'Les voyageurs paient-ils en ligne ?', a: 'Pas pour le moment : la réservation est confirmée en ligne et le règlement se fait directement auprès de vous, sur place.' },
  { q: 'Puis-je garder mes autres canaux de réservation ?', a: 'Oui. Ajoutez vos réservations externes en un clic dans le calendrier pour bloquer les dates sur Exploria360.' },
  { q: 'Je n’ai pas de visite 360°, est-ce un problème ?', a: 'Non. Nous vous accompagnons pour la réaliser ; si vous en avez déjà une (Spinview360…), nous l’intégrons.' },
  { q: 'Comment accéder à mon espace propriétaire ?', a: 'Après validation, vous recevez par e-mail un lien à usage unique pour créer votre mot de passe, puis vous vous connectez normalement.' },
];

export default function BecomeHostPage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <div className="bg-[#0B0B0C] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />

      {/* Hero */}
      <section className="on-dark relative flex min-h-[620px] text-white items-center overflow-hidden pt-[4.5rem] md:h-[78vh] md:max-h-[820px]">
        <picture>
          <source srcSet="/demo/hero.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/demo/hero.jpg" alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/25 rtl:bg-gradient-to-l" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Propriétaires de maisons d’hôtes</p>
          <h1 className="mt-4 max-w-3xl font-serif text-[clamp(2.4rem,6vw,4.8rem)] leading-[1.02]">Faites visiter votre maison avant même qu’on y entre.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">Exploria360 met votre maison d’hôtes en ligne avec une visite 360°, un calendrier en temps réel et des réservations directes.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#candidature" className="inline-flex h-14 items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-8 font-bold text-black shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:brightness-110">Devenir partenaire Exploria360</a>
            <Link href="/accommodation/maison-hotes-demo-exploria360" className="inline-flex h-14 items-center rounded-full border border-white/35 px-8 font-semibold text-white hover:border-amber-400 hover:text-amber-200">Voir un exemple de fiche</Link>
          </div>
        </div>
      </section>

      {/* Why */}
      <section aria-labelledby="why-title" className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10">
        <h2 id="why-title" className="max-w-2xl font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">Pourquoi publier votre maison sur Exploria360 ?</h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-7 transition-colors hover:border-amber-400/40">
              <span className="grid size-12 place-items-center rounded-2xl border border-amber-400/40 text-amber-300"><Icon className="size-6" aria-hidden="true" /></span>
              <h3 className="mt-5 font-serif text-2xl">{title}</h3>
              <p className="mt-2 leading-relaxed text-neutral-400">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Dashboard preview */}
      <section aria-labelledby="dash-title" className="border-y border-white/10 bg-[#080808] py-20">
        <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Votre espace propriétaire</p>
            <h2 id="dash-title" className="mt-4 font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">Tout votre établissement, sur un seul écran.</h2>
            <ul className="mt-8 space-y-4 text-neutral-300">
              {['Arrivées et départs du jour', 'Demandes à confirmer en un clic', 'Calendrier : bloquer, débloquer, ajouter une réservation', 'Tarifs saisonniers, frais et règles de la maison', 'E-mails automatiques à vos clients'].map((t) => (
                <li key={t} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
          {/* Illustrative preview (not real data) */}
          <figure aria-label="Aperçu illustratif du tableau de bord propriétaire" className="rounded-[1.6rem] border border-white/10 bg-[#111112] p-5 shadow-2xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Arrivées', CalendarRange], ['En attente', BellRing], ['Occupation', BarChart3], ['Accès', KeyRound]].map(([l, Icon]: any) => (
                <div key={l} className="rounded-xl border border-white/10 bg-[#0B0B0C] p-3">
                  <Icon className="size-4 text-amber-300" aria-hidden="true" />
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-neutral-500">{l}</p>
                  <div className="mt-1.5 h-5 w-12 rounded bg-white/10" />
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }, (_, i) => {
                const c = [3, 4, 5, 11, 12].includes(i) ? 'bg-red-500/40' : [17, 18].includes(i) ? 'bg-orange-400/50' : [24, 25, 26].includes(i) ? 'bg-neutral-600' : 'bg-emerald-500/25';
                return <span key={i} className={`h-8 rounded-md ${c}`} />;
              })}
            </div>
            <figcaption className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><Camera className="size-3.5" aria-hidden="true" /> Illustration de l’interface — vert : disponible · rouge : réservé · orange : en attente · gris : bloqué</figcaption>
          </figure>
        </div>
      </section>

      {/* Steps */}
      <section aria-labelledby="steps-title" className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10">
        <h2 id="steps-title" className="font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">Comment ça marche</h2>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="relative rounded-[1.5rem] border border-white/10 p-7">
              <span className="font-serif text-5xl text-amber-400/80">{s.n}</span>
              <h3 className="mt-4 font-serif text-2xl">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-neutral-400">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Form + FAQ */}
      <section id="candidature" aria-labelledby="form-title" className="scroll-mt-24 border-t border-white/10 bg-[#080808] py-20">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div className="rounded-[1.8rem] border border-amber-400/25 bg-[#111112] p-6 sm:p-10">
            <h2 id="form-title" className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)]">Devenir partenaire Exploria360</h2>
            <p className="mt-2 mb-8 text-neutral-400">Parlez-nous de votre maison : nous vous recontactons rapidement.</p>
            <HostApplicationForm />
          </div>
          <div>
            <h2 className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)]">Questions fréquentes</h2>
            <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                    {f.q}<span className="text-2xl leading-none text-amber-300 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-neutral-400">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-8 text-sm text-neutral-400">Déjà partenaire ? <Link href="/login" className="font-semibold text-amber-300 underline">Accéder à mon espace propriétaire</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
