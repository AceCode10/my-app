import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subjects - Browse All IGCSE, GCSE & A-Level Subjects',
  description: 'Explore our complete range of IGCSE, GCSE & A-Level subjects. From Mathematics and Sciences to Languages and Humanities - find resources for every subject you need.',
  keywords: [
    'IGCSE subjects',
    'GCSE subjects',
    'A-Level subjects',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Computer Science',
  ],
  openGraph: {
    title: 'Browse All Subjects - Find Your Study Resources',
    description: 'Explore our complete range of IGCSE, GCSE & A-Level subjects with comprehensive study materials.',
    url: 'https://igaprep.com/subjects',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/subjects',
  },
};

export default function SubjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      {children}
    </div>
  );
}
