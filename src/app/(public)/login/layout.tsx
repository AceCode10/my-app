import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Access Your Account',
  description: 'Sign in to your IGA Prep account to access your personalized study dashboard, saved progress, and premium resources.',
  openGraph: {
    title: 'Login to IGA Prep',
    description: 'Access your personalized study dashboard and continue your exam preparation journey.',
    url: 'https://igaprep.com/login',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/login',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
