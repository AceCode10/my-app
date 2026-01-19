import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing Plans - Free & Premium Study Resources',
  description: 'Choose the perfect IGA Prep plan for your exam preparation. Free access to essential resources or upgrade to Pro for unlimited past papers, revision notes, and advanced features.',
  keywords: [
    'IGA Prep pricing',
    'exam preparation subscription',
    'IGCSE study plan',
    'GCSE revision subscription',
    'A-Level study resources',
    'free exam resources',
    'premium study materials',
  ],
  openGraph: {
    title: 'IGA Prep Pricing - Plans for Every Student',
    description: 'Choose the perfect plan for your exam preparation. Free access to essential resources or upgrade for unlimited features.',
    url: 'https://igaprep.com/pricing',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
