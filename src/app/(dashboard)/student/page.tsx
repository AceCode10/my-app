'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, Flame, ChevronRight, Award,
  FileText, Target, Clock, Play,
  GraduationCap, ClipboardList, Settings, AlertCircle, Globe,
  ChevronDown
} from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-section';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { ContinueWhereYouLeftOff } from '@/components/ContinueWhereYouLeftOff';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import { getFriendlyName } from '@/lib/utils/name';
import { getCountryName } from '@/lib/countries';
import { XPProgressBar, StreakDisplay, BadgeDisplay } from '@/components/gamification';
import { useGamification } from '@/hooks/use-gamification';

const supabase = createClient();

interface DashboardData {
  stats: {
    xp: number;
    streak: number;
    badges: number;
    papersCompleted: number;
    questionsAnswered: number;
    averageScore: number;
  };
  assignments: any[];
  recentAttempts: any[];
}

const StudentDashboard = () => {
  const { user, loading } = useUser();
  const { gamification, loading: isLoadingGamification } = useGamification();

  const userExamBoards = user?.exam_boards || [];
  const userLevel = user?.level;
  const userCountry = user?.country;
  const onboardingCompleted = user?.onboarding_completed;
  const selectedBoardsInfo = EXAM_BOARDS.filter(b => userExamBoards.includes(b.id));

  // Single optimized query for all dashboard data
  const { data: dashboardData, isLoading: isLoadingData } = useQuery({
    queryKey: ['student-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error('No user');

      // Batch all queries in parallel for maximum performance
      const [
        userDataRes,
        badgesRes,
        attemptsRes,
        papersCompletedRes,
        enrollmentsRes
      ] = await Promise.all([
        supabase.from('users').select('xp, streak_days').eq('id', user.id).single(),
        supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('assessment_attempts')
          .select('id, paper_id, status, score, percentage, submitted_at, started_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false, nullsFirst: false })
          .limit(5),
        supabase.from('assessment_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'submitted'),
        supabase.from('enrollments').select('class_id').eq('user_id', user.id).eq('status', 'active')
      ]);

      // Calculate average score
      let avgScore = 0;
      const attemptsData = attemptsRes.data || [];
      if (attemptsData.length > 0) {
        const completedAttempts = attemptsData.filter((a: any) => a.percentage !== null);
        if (completedAttempts.length > 0) {
          avgScore = completedAttempts.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / completedAttempts.length;
        }
      }

      // Fetch assignments if user has classes
      let assignmentsData: any[] = [];
      const classIds = enrollmentsRes.data?.map((e: any) => e.class_id) || [];
      if (classIds.length > 0) {
        const { data } = await supabase
          .from('assignments')
          .select('id, title, due_at, target_class_id, test_id, paper_id')
          .in('target_class_id', classIds)
          .order('due_at', { ascending: true })
          .limit(5);
        assignmentsData = data || [];
      }

      return {
        stats: {
          xp: userDataRes.data?.xp || 0,
          streak: userDataRes.data?.streak_days || 0,
          badges: badgesRes.count || 0,
          papersCompleted: papersCompletedRes.count || 0,
          questionsAnswered: attemptsRes.count || 0,
          averageScore: Math.round(avgScore)
        },
        assignments: assignmentsData,
        recentAttempts: attemptsData
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  const stats = dashboardData?.stats || { xp: 0, streak: 0, badges: 0, papersCompleted: 0, questionsAnswered: 0, averageScore: 0 };
  const assignments = dashboardData?.assignments || [];
  const recentAttempts = dashboardData?.recentAttempts || [];

  if (loading || isLoadingData) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">Please log in to view your dashboard.</p>
            <Button asChild className="mt-4">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section with User Preferences */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {getFriendlyName(user.display_name, user.email)}!</h1>
          <p className="text-muted-foreground mt-1">Continue your learning journey</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-3 justify-end">
            {userCountry && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{getCountryName(userCountry)}</span>
              </div>
            )}
            {selectedBoardsInfo.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Board:</span>
                <div className="flex gap-1">
                  {selectedBoardsInfo.map(board => (
                    <Badge key={board.id} variant="secondary" className={board.color + ' text-white text-xs'}>
                      {board.shortName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {userLevel && (
              <div className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">{userLevel.toUpperCase().replace('_', ' ')}</Badge>
              </div>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total XP</p>
                <p className="text-3xl font-bold mt-1">{stats.xp.toLocaleString()}</p>
                <p className="text-purple-100 text-xs mt-1">Keep learning!</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Current Streak</p>
                <p className="text-3xl font-bold mt-1">{stats.streak}</p>
                <p className="text-orange-100 text-xs mt-1">{stats.streak === 1 ? 'Day' : 'Days'} streak</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-yellow-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Badges Earned</p>
                <p className="text-3xl font-bold mt-1">{stats.badges}</p>
                <p className="text-yellow-100 text-xs mt-1">Keep collecting!</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Average Score</p>
                <p className="text-3xl font-bold mt-1">{stats.averageScore}%</p>
                <p className="text-green-100 text-xs mt-1">Great progress!</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Where You Left Off */}
      <ContinueWhereYouLeftOff />

      {/* Quick Practice Actions */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Start Practicing
          </CardTitle>
          <CardDescription>Choose how you want to practice today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="default" className="h-24 flex-col gap-2" asChild>
              <Link href="/student/subjects">
                <Target className="h-6 w-6" />
                <span>Topical Questions</span>
                <span className="text-xs opacity-80">Practice by topic</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" asChild>
              <Link href="/student/papers">
                <FileText className="h-6 w-6" />
                <span>Past Papers</span>
                <span className="text-xs opacity-80">Full exam practice</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" asChild>
              <Link href="/student/classes">
                <GraduationCap className="h-6 w-6" />
                <span>My Classes</span>
                <span className="text-xs opacity-80">View assignments</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Only show if there's content */}
      {(assignments.length > 0 || recentAttempts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Assignments - Only show if there are assignments */}
          {assignments.length > 0 && (
            <CollapsibleCard
              title="Upcoming Assignments"
              icon={<ClipboardList className="h-4 w-4" />}
              defaultOpen={true}
              storageKey="student-assignments"
              action={
                <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                  <Link href="/student/classes">View All</Link>
                </Button>
              }
            >
              <div className="space-y-3">
                {assignments.slice(0, 3).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/student/assessments/${assignment.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CollapsibleCard>
          )}

          {/* Recent Attempts - Only show if there are attempts */}
          {recentAttempts.length > 0 && (
            <CollapsibleCard
              title="Recent Activity"
              icon={<Clock className="h-4 w-4" />}
              defaultOpen={true}
              storageKey="student-activity"
              action={
                <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                  <Link href="/student/assessments">View All</Link>
                </Button>
              }
            >
              <div className="space-y-3">
                {recentAttempts.slice(0, 3).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {attempt.status === 'submitted' ? 'Completed' : 'In Progress'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.submitted_at 
                          ? new Date(attempt.submitted_at).toLocaleDateString()
                          : new Date(attempt.started_at).toLocaleDateString()}
                      </p>
                    </div>
                    {attempt.percentage !== null && (
                      <Badge variant={attempt.percentage >= 70 ? 'default' : attempt.percentage >= 50 ? 'secondary' : 'destructive'}>
                        {Math.round(attempt.percentage)}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleCard>
          )}
        </div>
      )}
    </div>
  );
};

function StatsCard({ icon, title, value, subtitle }: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="p-3 bg-muted rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-gradient-to-br from-muted to-muted/80">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentDashboard;
