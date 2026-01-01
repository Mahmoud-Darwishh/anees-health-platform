import { Metadata } from 'next';
import GeneralHomeOne from '@/components/sections/home/generalHomeOne';
import { generateHomeMetadata } from '@/lib/utils/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateHomeMetadata(locale);
}

export default function HomePage() {
  return <GeneralHomeOne />;
}