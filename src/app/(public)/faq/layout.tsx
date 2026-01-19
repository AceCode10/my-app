import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions',
  description: 'Find answers to common questions about IGA Prep. Learn about our study resources, subscription plans, exam preparation features, and how to get the most from our platform.',
  keywords: [
    'IGA Prep FAQ',
    'frequently asked questions',
    'exam preparation help',
    'study resources questions',
    'subscription help',
  ],
  openGraph: {
    title: 'FAQ - Get Answers to Your Questions',
    description: 'Find answers to common questions about IGA Prep and our exam preparation resources.',
    url: 'https://igaprep.com/faq',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/faq',
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
