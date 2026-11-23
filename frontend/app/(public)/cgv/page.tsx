import type { Metadata } from 'next';
import { DraftBanner, PageShell, Pending, proseClasses } from '@/components/exploria/PageShell';

export const metadata: Metadata = {
  title: 'Conditions générales',
  robots: { index: false, follow: true }, // draft until legal details are completed
  alternates: { canonical: '/cgv' },
};

export default function CGVPage() {
  return (
    <PageShell eyebrow="Informations légales" title="Conditions générales d’utilisation et de vente">
      <DraftBanner>
        Brouillon à faire valider par un conseil juridique avant l’ouverture des réservations. Les conditions de vente
        définitives (prix, paiement, annulation) seront publiées avant toute réservation.
      </DraftBanner>
      <div className={proseClasses}>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions encadrent l’utilisation du site Exploria360, exploité par <Pending>raison sociale de l’exploitant</Pending>,
          qui permet de découvrir des maisons d’hôtes en Tunisie au moyen de visites virtuelles 360°.
        </p>

        <h2>2. Phase de lancement</h2>
        <p>
          À la date de publication, <strong>les réservations ne sont pas ouvertes</strong>. La maison d’hôtes présentée est une démonstration :
          aucune réservation, aucun paiement et aucune mise en attente ne sont possibles pour celle-ci.
        </p>

        <h2>3. Utilisation du site</h2>
        <ul>
          <li>L’accès au site et aux visites 360° est gratuit.</li>
          <li>L’utilisateur s’engage à fournir des informations exactes lors de la création d’un compte ou d’une demande de contact.</li>
          <li>Il est interdit de perturber le fonctionnement du site ou de tenter d’en contourner les protections.</li>
        </ul>

        <h2>4. Réservations (à venir)</h2>
        <p>
          Les conditions de réservation, de paiement, d’annulation et de remboursement seront précisées ici avant l’ouverture des réservations :
          <Pending>conditions de vente, délais d’annulation, moyens de paiement, TVA / taxes de séjour</Pending>.
        </p>

        <h2>5. Responsabilité</h2>
        <p>
          Exploria360 s’efforce d’assurer l’exactitude des informations publiées. Les informations relatives à chaque maison d’hôtes
          proviennent de ses hôtes et sont indiquées lorsqu’elles sont renseignées.
        </p>

        <h2>6. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit tunisien. <Pending>juridiction compétente, médiation</Pending></p>
      </div>
    </PageShell>
  );
}
