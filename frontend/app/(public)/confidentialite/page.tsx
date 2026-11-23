import type { Metadata } from 'next';
import Link from 'next/link';
import { DraftBanner, PageShell, Pending, proseClasses } from '@/components/exploria/PageShell';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  robots: { index: false, follow: true }, // draft until legal details are completed
  alternates: { canonical: '/confidentialite' },
};

export default function ConfidentialitePage() {
  return (
    <PageShell eyebrow="Informations légales" title="Politique de confidentialité">
      <DraftBanner>
        Brouillon rédigé à partir du fonctionnement actuel du site. Il doit être complété avec les informations de
        l’exploitant et validé par un conseil juridique (notamment au regard de la loi tunisienne n° 2004-63 sur la
        protection des données à caractère personnel).
      </DraftBanner>
      <div className={proseClasses}>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement est <Pending>raison sociale, adresse, contact du responsable</Pending>. Voir aussi les{' '}
          <Link href="/mentions-legales">mentions légales</Link>.
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li>
            <strong>Compte utilisateur</strong> : nom, adresse e-mail, téléphone (facultatif), mot de passe (conservé sous forme
            chiffrée, jamais en clair).
          </li>
          <li>
            <strong>Demande de contact propriétaire</strong> : nom de la maison d’hôtes, nom du contact, e-mail, téléphone, ville,
            message facultatif.
          </li>
          <li>
            <strong>Réservations</strong> (lorsqu’elles seront ouvertes) : dates de séjour, nombre de voyageurs, coordonnées des
            voyageurs, demandes particulières.
          </li>
          <li>
            <strong>Données techniques</strong> : journaux de connexion et tentatives de connexion, utilisés pour la sécurité du service.
          </li>
        </ul>

        <h2>3. Finalités et bases</h2>
        <ul>
          <li>Création et gestion du compte, authentification.</li>
          <li>Traitement des demandes de contact et recontact des propriétaires.</li>
          <li>Gestion des réservations et envoi des confirmations (à l’ouverture des réservations).</li>
          <li>Sécurité du site et prévention des abus.</li>
        </ul>

        <h2>4. Cookies et stockage local</h2>
        <p>
          Le site utilise uniquement des éléments nécessaires à son fonctionnement : un cookie de session sécurisé pour
          maintenir la connexion et un stockage local du navigateur pour mémoriser la session et le panier. À ce jour, aucun outil
          de mesure d’audience ni aucun traceur publicitaire n’est installé. <Pending>mettre à jour cette section si un outil d’analyse est ajouté</Pending>
        </p>

        <h2>5. Destinataires et prestataires</h2>
        <p>
          Les données sont accessibles à l’équipe habilitée et à des prestataires techniques strictement nécessaires :
          hébergement, base de données, envoi d’e-mails, stockage d’images et, à l’ouverture des paiements, prestataire de
          paiement. <Pending>liste nominative des prestataires et pays d’hébergement des données</Pending>
        </p>
        <p>
          Les visites virtuelles 360° sont affichées depuis le site du prestataire qui les diffuse (spinview360.com) lorsque
          vous lancez la visite ; ce prestataire peut recevoir votre adresse IP et des informations techniques de navigation.
        </p>

        <h2>6. Durée de conservation</h2>
        <p><Pending>durées de conservation (compte, demandes de contact, réservations, journaux)</Pending></p>

        <h2>7. Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la rectification ou la suppression de vos données, et vous opposer à leur traitement pour
          des motifs légitimes. Adressez votre demande à <Pending>adresse e-mail dédiée</Pending>. Vous pouvez également saisir
          l’Instance Nationale de Protection des Données Personnelles (INPDP).
        </p>

        <h2>8. Mises à jour</h2>
        <p>Cette politique peut évoluer. Date de dernière mise à jour : <Pending>date</Pending>.</p>
      </div>
    </PageShell>
  );
}
