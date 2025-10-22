
'use client';

import { QuizClient } from '@/components/quiz-client';
import { getSubjectBySlug } from '@/lib/subjects.tsx';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function TopicQuizPage({
  params,
}: {
  params: { subject: string; topic: string };
}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const pathname = usePathname();

  const subjectData = getSubjectBySlug(subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }

  const topicData = subjectData.topics?.find(
    (t) => t.name.toLowerCase().replace(/ /g, '-') === topicSlug
  );

  if (!topicData) {
    return <div>Topic not found.</div>;
  }
  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href={"/dashboard/subjects"} className="hover:text-primary">
          Subjects
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link
          href={`/dashboard/subjects/${subjectSlug}`}
          className="hover:text-primary"
        >
          {subjectData.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground capitalize">{topicName} Quiz</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="lg:col-span-1 bg-card p-4 rounded-2xl shadow-sm border sticky top-24">
            <h3 className="font-bold text-lg text-foreground px-2 mb-2">{subjectData.name} Topics</h3>
            <nav className="flex flex-col space-y-1">
                {subjectData.topics?.map(t => {
                    const currentTopicSlug = t.name.toLowerCase().replace(/ /g, '-');
                    const href = `/dashboard/subjects/${subjectSlug}/${currentTopicSlug}/quiz`;
                    const isActive = pathname === href;
                    return (
                        <Link href={href} key={t.name}>
                            <div className={cn(
                                "p-2 rounded-md text-sm font-medium transition-colors",
                                isActive 
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}>
                                {t.name}
                            </div>
                        </Link>
                    )
                })}
            </nav>
        </aside>

        <main className="lg:col-span-3">
             <QuizClient topic={topicData.name} classId={classId} />
        </main>
      </div>
    </div>
  );
}
