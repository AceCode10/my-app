import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { Subject } from '@/types/database';

export default async function SubjectsPage() {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  // Group by level
  const subjectsByLevel = subjects?.reduce((acc, subject) => {
    if (!acc[subject.level]) {
      acc[subject.level] = [];
    }
    acc[subject.level].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>) || {};

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Browse Subjects</h1>
        <p className="text-muted-foreground mt-2">
          Explore our comprehensive collection of IGCSE and A-Level subjects
        </p>
      </div>

      {Object.entries(subjectsByLevel).map(([level, levelSubjects]) => (
        <div key={level} className="space-y-4">
          <h2 className="text-2xl font-semibold">{level}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {levelSubjects.map((subject) => (
              <Card key={subject.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {subject.icon_url ? (
                        <img 
                          src={subject.icon_url} 
                          alt={subject.name}
                          className="w-12 h-12 rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle>{subject.name}</CardTitle>
                        <CardDescription>{subject.code}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {subject.description || `Study ${subject.name} with comprehensive notes and practice questions.`}
                  </p>
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/subjects/${subject.slug}`}>
                        View Topics
                      </Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exam Board: {subject.exam_board}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {(!subjects || subjects.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No subjects available yet</p>
            <p className="text-sm text-muted-foreground">
              Check back soon for new content!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
