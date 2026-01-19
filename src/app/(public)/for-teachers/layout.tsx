import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Teachers - Classroom Tools & Resources',
  description: 'Empower your teaching with IGA Prep\'s teacher tools. Create classes, assign assessments, track student progress, and access premium teaching resources for IGCSE, GCSE & A-Level.',
  keywords: [
    'teacher resources',
    'classroom tools',
    'student progress tracking',
    'assessment creation',
    'IGCSE teaching',
    'GCSE teaching resources',
    'A-Level teacher tools',
    'education technology',
  ],
  openGraph: {
    title: 'For Teachers - Empower Your Classroom',
    description: 'Create classes, assign assessments, and track student progress with our comprehensive teacher tools.',
    url: 'https://igaprep.com/for-teachers',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/for-teachers',
  },
};

export default function ForTeachersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
