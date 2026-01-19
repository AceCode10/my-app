import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Create Your Free Account',
  description: 'Join 50,000+ students on IGA Prep. Create your free account to access IGCSE, GCSE & A-Level study resources, track your progress, and achieve exam success.',
  keywords: [
    'sign up IGA Prep',
    'create account',
    'free exam resources',
    'student registration',
    'IGCSE study account',
  ],
  openGraph: {
    title: 'Join IGA Prep - Start Your Success Journey',
    description: 'Create your free account and join 50,000+ students achieving exam success.',
    url: 'https://igaprep.com/signup',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/signup',
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
