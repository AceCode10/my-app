import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Resources - Past Papers, Notes, Questions & More',
  description: 'Access thousands of IGCSE, GCSE & A-Level study resources including past papers, revision notes, topical questions, flashcards, and quizzes. All exam boards covered.',
  keywords: [
    'IGCSE past papers',
    'GCSE revision notes',
    'A-Level study resources',
    'topical questions',
    'exam flashcards',
    'practice quizzes',
    'Cambridge resources',
    'Edexcel materials',
  ],
  openGraph: {
    title: 'Study Resources - Everything You Need to Succeed',
    description: 'Access thousands of past papers, revision notes, topical questions, and more for IGCSE, GCSE & A-Level exams.',
    url: 'https://igaprep.com/resources',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/resources',
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </>
  );
}

    