'use client';

import { QuizClient } from '@/components/quiz-client';
import { getSubjectBySlug } from '@/lib/subjects.tsx';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function TopicQuizPage({
  params,
}: {
  params: { subject: string; topic: string };
}) {
  const { subject, topic } = params;
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const from = searchParams.get('from');

  const subjectData = getSubjectBySlug(subject);
  const topicName = useMemo(() => topic.replace(/-/g, ' '), [topic]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }

  const topicData = subjectData.topics?.find(
    (t) => t.name.toLowerCase().replace(/ /g, '-') === topic
  );

  if (!topicData) {
    return <div>Topic not found.</div>;
  }
  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href={from === 'public' ? "/resources/quizzes" : "/dashboard/subjects"} className="hover:text-primary">
          {from === 'public' ? 'Quizzes' : 'Subjects'}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link
          href={from === 'public' ? `/subjects/${subject}` : `/dashboard/subjects/${subject}`}
          className="hover:text-primary"
        >
          {subjectData.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground capitalize">{topicName} Quiz</span>
      </div>
      <QuizClient topic={topicData.name} classId={classId} />
    </div>
  );
}
