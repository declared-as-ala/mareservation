import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/exploria/PageShell';

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    "Visitez une maison d'hôtes en 360°, vérifiez ses informations, puis réservez. Voici comment fonctionne Exploria360.",
  alternates: { canonical: '/comment-ca-marche' },
};

const STEPS = [
  {
    title: 'Explorez en 360°',
    text: 'Ouvrez la visite virtuelle d’une maison d’hôtes. Faites glisser pour regarder autour de vous, passez en plein écran pour une immersion totale.',
  },
  {
    title: 'Vérifiez les informations',
    text: 'Adresse, chambres, équipements, tarifs et disponibilités sont indiqués lorsqu’ils sont renseignés par la maison. Ce qui ne l’est pas est signalé comme tel.',
  },
  {
    title: 'Réservez simplement',
    text: 'Les réservations ne sont pas encore ouvertes. Elles arriveront avec les premières maisons partenaires, avec des disponibilités réelles.',
  },
] as const;

export default function CommentCaMarchePage() {
  return (
    <PageShell
      eyebrow="Comment ça marche"
      title={<>Explorer, puis <span className="italic text-amber-400">réserver.</span></>}
      intro="Trois étapes, dans cet ordre : voir, comprendre, réserver."
      narrow={false}
    >
      <ol className="grid gap-px overflow-hidden rounded-[1.75rem] bg-white/[0.08] md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="bg-[#0B0B0C] p-8 sm:p-10">
            <span className="font-serif text-5xl italic text-white/20" aria-hidden="true">0{i + 1}</span>
            <h2 className="mt-6 font-serif text-[1.65rem] font-medium leading-tight text-white">{s.title}</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-neutral-400">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 flex flex-col items-start gap-4 rounded-[1.75rem] bg-[#111112] p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <h2 className="font-serif text-3xl font-medium">Essayez l’expérience.</h2>
          <p className="mt-2 text-white/75">Visitez notre maison d’hôtes de démonstration en 360°.</p>
        </div>
        <Link
          href="/accommodations"
          className="inline-flex h-13 shrink-0 items-center rounded-full bg-amber-400 px-8 py-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300"
        >
          Explorer les maisons
        </Link>
      </div>
    </PageShell>
  );
}
