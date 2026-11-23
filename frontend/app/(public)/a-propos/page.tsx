import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/exploria/PageShell';

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "Exploria360 permet de visiter les maisons d'hôtes de Tunisie en 360° avant de réserver. Découvrez notre vision et notre démarche.",
  alternates: { canonical: '/a-propos' },
};

const VALUES = [
  {
    title: 'Voir avant de choisir',
    text: 'Une photo ne dit pas tout. La visite 360° permet de se projeter dans les lieux, à son rythme, avant de décider.',
  },
  {
    title: 'Authenticité',
    text: 'Nous nous intéressons aux maisons d’hôtes qui ont une âme : une architecture, un accueil, une manière d’être reçu.',
  },
  {
    title: 'Transparence',
    text: 'Aucune information inventée. Ce qui n’est pas encore renseigné est indiqué comme tel, jamais déguisé.',
  },
  {
    title: 'Simplicité',
    text: 'Un parcours clair, de la découverte à la réservation, sur mobile comme sur ordinateur.',
  },
] as const;

export default function AProposPage() {
  return (
    <PageShell
      eyebrow="À propos"
      title={<>Faire découvrir la Tunisie <span className="italic text-amber-400">de l’intérieur.</span></>}
      intro="Exploria360 est une plateforme dédiée aux maisons d’hôtes de Tunisie, pensée autour d’une idée simple : explorer avant de réserver."
      narrow={false}
    >
      <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="space-y-6 text-[1.05rem] leading-relaxed text-neutral-400">
          <h2 className="font-serif text-4xl font-medium text-white">Notre démarche</h2>
          <p>
            Choisir une maison d’hôtes, c’est choisir une ambiance autant qu’une chambre. Pourtant, on réserve souvent sur
            quelques photos. Exploria360 propose une autre façon de faire : parcourir la maison en immersion 360°, comprendre
            les volumes, la lumière, les espaces à vivre — puis réserver en connaissance de cause.
          </p>
          <p>
            Exploria360 est aujourd’hui en phase de lancement. Nous présentons une maison d’hôtes de démonstration pour
            montrer ce que cette expérience peut apporter aux voyageurs comme aux hôtes. Les réservations ne sont pas encore
            ouvertes.
          </p>
          <p>
            Vous êtes propriétaire d’une maison d’hôtes en Tunisie ? Nous serions heureux d’échanger avec vous.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-13 items-center rounded-full bg-amber-400 px-8 py-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300"
          >
            Contacter l’équipe
          </Link>
        </div>

        <ul className="divide-y divide-white/10 border-y border-white/10">
          {VALUES.map((v, i) => (
            <li key={v.title} className="flex gap-5 py-7">
              <span className="font-serif text-3xl italic text-amber-400/70" aria-hidden="true">0{i + 1}</span>
              <div>
                <h3 className="font-serif text-2xl font-medium text-white">{v.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-neutral-400">{v.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
