import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Get Help & Support',
  description: 'Get in touch with the IGA Prep team. We\'re here to help with your exam preparation questions, technical support, and partnership inquiries.',
  keywords: [
    'contact IGA Prep',
    'exam preparation support',
    'student help',
    'technical support',
    'education partnership',
  ],
  openGraph: {
    title: 'Contact IGA Prep - We\'re Here to Help',
    description: 'Get in touch with our team for support, questions, or partnership inquiries.',
    url: 'https://igaprep.com/contact',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
