import type { Metadata } from 'next';
import { DraftBanner, PageShell, Pending, proseClasses } from '@/components/exploria/PageShell';

export const metadata: Metadata = {
  title: 'Mentions légales',
  robots: { index: false, follow: true }, // draft until legal details are completed
  alternates: { canonical: '/mentions-legales' },
};

export default function MentionsLegalesPage() {
  return (
    <PageShell eyebrow="Informations légales" title="Mentions légales">
      <DraftBanner>
        Les informations marquées « À compléter » doivent être fournies par l’éditeur du site avant publication définitive.
      </DraftBanner>
      <div className={proseClasses}>
        <h2>Éditeur du site</h2>
        <ul>
          <li>Nom du site : Exploria360 (www.exploria360.com)</li>
          <li>Raison sociale / dénomination : <Pending>nom de la société ou de l’exploitant</Pending></li>
          <li>Forme juridique et capital : <Pending>forme juridique, capital</Pending></li>
          <li>Matricule fiscal / registre du commerce : <Pending>numéros d’immatriculation</Pending></li>
          <li>Adresse du siège : <Pending>adresse postale complète</Pending></li>
          <li>Directeur de la publication : <Pending>nom et fonction</Pending></li>
          <li>Contact : <Pending>adresse e-mail et téléphone vérifiés</Pending></li>
        </ul>

        <h2>Hébergement</h2>
        <p>Hébergeur : <Pending>nom, adresse et contact de l’hébergeur du serveur</Pending></p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Les éléments graphiques et textuels du site Exploria360 sont protégés. Les visites virtuelles présentées sont
          diffusées avec l’autorisation de leurs ayants droit et restent soumises à leurs mentions d’origine.
        </p>

        <h2>Nature du service</h2>
        <p>
          Exploria360 est actuellement en phase de lancement. La maison d’hôtes présentée est une démonstration : elle n’est pas
          réservable et n’engage aucune offre commerciale.
        </p>
      </div>
    </PageShell>
  );
}
