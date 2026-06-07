import { redirect } from 'next/navigation';

export default async function HotelLegacyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/accommodation/${slug}`);
}
