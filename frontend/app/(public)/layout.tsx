import { ConditionalShell } from '@/components/layout/ConditionalShell';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConditionalShell>{children}</ConditionalShell>;
}
