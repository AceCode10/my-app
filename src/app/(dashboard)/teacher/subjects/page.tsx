'use client';

import { useQuery } from '@tanstack/react-query';
import { SubjectCard } from '@/components/subject-card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpen, GraduationCap, Globe, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import { getCountryName } from '@/lib/countries';
import { SubjectsGrid } from '@/components/subjects-grid';

const supabase = createClient();

interface UserSubject {
  id: string;
  subject_id: string;
  subjects?: {
    id: string;
    name: string;
    slug: string;
    code: string;
    exam_board_id: string;
    icon_url?: string;
    color?: string;
    display_name?: string;
  } | null;
}

export default function TeacherSubjectsPage() {
  const { user, loading: userLoading } = useUser();

  const userExamBoards = user?.exam_boards || [];
  const userLevels = user?.levels || [];
  const userCountry = user?.country;
  const selectedBoardsInfo = EXAM_BOARDS.filter(b => userExamBoards.includes(b.id));

  // Fetch teacher's selected subjects
  const { data: userSubjects = [], isLoading } = useQuery({
    queryKey: ['user-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_subjects')
        .select('id, subject_id, subjects(id, name, slug, code, exam_board_id, icon_url, color, display_name)')
        .eq('user_id', user.id);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        subject_id: item.subject_id,
        subjects: Array.isArray(item.subjects) ? item.subjects[0] : item.subjects
      })) as UserSubject[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Map user's subjects
  const mySubjects = userSubjects
    .map(us => {
      if (!us.subjects) return null;
      return {
        id: us.subjects.id,
        name: us.subjects.display_name || us.subjects.name,
        slug: us.subjects.slug,
        code: us.subjects.code,
        icon_url: us.subjects.icon_url,
        color: us.subjects.color || '#3b82f6',
      };
    })
    .filter(Boolean);

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            My Subjects
          </h1>
          <p className="text-muted-foreground mt-1">
            Subjects you teach - manage content and track student progress
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/subjects/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Subjects
          </Link>
        </Button>
      </div>

      {/* User preferences summary card */}
      {(selectedBoardsInfo.length > 0 || userLevels.length > 0 || userCountry) && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              {userCountry && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{getCountryName(userCountry)}</span>
                </div>
              )}
              {selectedBoardsInfo.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Exam Boards:</span>
                  <div className="flex gap-1">
                    {selectedBoardsInfo.map(board => (
                      <Badge key={board.id} variant="secondary" className={board.color + ' text-white text-xs'}>
                        {board.shortName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {userLevels.length > 0 && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-1 flex-wrap">
                    {userLevels.map(level => (
                      <Badge key={level} variant="outline">{level.toUpperCase().replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" asChild className="ml-auto">
                <Link href="/teacher/settings">
                  <Settings className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher's Selected Subjects */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
          ))}
        </div>
      ) : mySubjects.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Subjects Selected</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {user?.onboarding_completed 
              ? "You skipped subject selection during setup. Add subjects you teach to get started!"
              : "Add subjects you teach to manage content and track student progress."
            }
          </p>
          <Button asChild size="lg">
            <Link href="/teacher/subjects/add">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Your Subjects
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Selected subjects count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mySubjects.length} subject{mySubjects.length !== 1 ? 's' : ''} you teach
            </p>
          </div>

          {/* Subject cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {mySubjects.map((subject) => subject && (
              <SubjectCard 
                key={subject.slug}
                name={subject.name}
                code={subject.code}
                icon={subject.icon_url}
                path={`/teacher/subjects/${subject.slug}`}
                color={subject.color}
                showProgress={false}
              />
            ))}
          </div>

          {/* Add more subjects prompt */}
          <Card className="mt-8 border-dashed">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">Teaching more subjects?</p>
                <p className="text-sm text-muted-foreground">Add more subjects to your teaching dashboard</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/teacher/subjects/add">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Browse Subjects
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Browse All Subjects Section */}
      <div className="pt-8 border-t">
        <h2 className="text-xl font-semibold mb-4">Browse All Subjects</h2>
        <SubjectsGrid 
          basePath="/teacher/subjects"
          showAlphaFilter={true}
        />
      </div>
    </div>
  );
}
