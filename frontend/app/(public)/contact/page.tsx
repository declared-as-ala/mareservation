import type { Metadata } from 'next';
import { PageShell } from '@/components/exploria/PageShell';
import { OwnerEnquiryForm } from '@/components/exploria/OwnerEnquiryForm';

export const metadata: Metadata = {
  title: 'Contact — propriétaires de maisons d’hôtes',
  description:
    "Vous êtes propriétaire d'une maison d'hôtes en Tunisie ? Présentez-nous votre maison : nous vous recontactons pour la faire découvrir en 360°.",
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title={<>Parlons de <span className="italic text-amber-400">votre maison.</span></>}
      intro="Vous êtes propriétaire d’une maison d’hôtes en Tunisie ? Présentez-la en quelques lignes : nous vous recontactons."
    >
      <OwnerEnquiryForm />
    </PageShell>
  );
}
