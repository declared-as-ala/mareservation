import type { Metadata } from 'next';

// Private page (secret link): never indexed, never referred.
export const metadata: Metadata = {
  title: 'Suivi de ma demande',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
