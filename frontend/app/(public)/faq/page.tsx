import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/exploria/PageShell';

export const metadata: Metadata = {
  title: 'Questions fréquentes',
  description: "Réponses aux questions sur Exploria360 : visite 360°, réservations, propriétaires de maisons d'hôtes.",
  alternates: { canonical: '/faq' },
};

const FAQ = [
  {
    q: 'Puis-je réserver une maison d’hôtes dès maintenant ?',
    a: 'Pas encore. Exploria360 est en phase de lancement : la maison d’hôtes présentée est une démonstration et les réservations ne sont pas encore ouvertes.',
  },
  {
    q: 'La maison d’hôtes de démonstration est-elle réelle ?',
    a: 'Elle sert à illustrer l’expérience de visite 360°. Il ne s’agit pas d’une maison d’hôtes réservable : aucune adresse, chambre, tarif ni disponibilité n’est annoncé.',
  },
  {
    q: 'Comment fonctionne la visite 360° ?',
    a: 'Faites glisser pour regarder autour de vous. Sur mobile, vous pouvez aussi incliner votre téléphone. Le bouton « Plein écran » offre une immersion totale ; sur certains navigateurs mobiles, la visite s’ouvre alors dans un nouvel onglet.',
  },
  {
    q: 'La visite ne se charge pas, que faire ?',
    a: 'Essayez de recharger la visite, ou ouvrez-la dans un nouvel onglet grâce au lien sous le lecteur. Une connexion stable est recommandée.',
  },
  {
    q: 'Je suis propriétaire d’une maison d’hôtes. Comment être présent sur Exploria360 ?',
    a: 'Écrivez-nous via la page Contact en présentant votre maison. Nous vous recontactons pour échanger sur votre projet.',
  },
  {
    q: 'Que faites-vous de mes données personnelles ?',
    a: 'Nous ne collectons que ce qui est nécessaire au fonctionnement du service. Consultez notre politique de confidentialité pour le détail.',
  },
] as const;

export default function FAQPage() {
  return (
    <PageShell eyebrow="Aide" title="Questions fréquentes">
      <div className="divide-y divide-white/10 border-y border-white/10">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-6">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-2xl font-medium leading-snug text-white marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400">
              {item.q}
              <span aria-hidden="true" className="mt-1 text-amber-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-neutral-400">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-neutral-400">
        Une autre question ? <Link href="/contact" className="font-medium text-amber-400 underline">Écrivez-nous</Link>.
      </p>
    </PageShell>
  );
}
