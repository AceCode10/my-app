'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, Flame, ChevronRight, Award,
  FileText, Target, Clock, Play,
  GraduationCap, ClipboardList, AlertCircle, Globe,
  ChevronDown, BookOpen, Layers
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
import { XPProgressBar, StreakDisplay, DailyGoalRing, DailyGoalsRow } from '@/components/gamification';
import { useGamification } from '@/hooks/use-gamification';
import { useDailyGoals } from '@/hooks/use-daily-goals';

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
  const { gamification, streakData, getLevelProgress, getXPToNextLevel, getLevelTitle, loading: isLoadingGamification, refresh: refreshGamification } = useGamification();
  const { goals, primaryGoal, isLoading: isLoadingGoals, refreshGoals } = useDailyGoals();

  const userExamBoards = user?.exam_boards || [];
  const userLevel = user?.level;
  const userCountry = user?.country;
  const onboardingCompleted = user?.onboarding_completed;
  const selectedBoardsInfo = EXAM_BOARDS.filter(b => userExamBoards.includes(b.id));

  // Listen for goal preference changes and XP earned events to refresh data
  React.useEffect(() => {
    const handleGoalChange = () => {
      refreshGoals();
    };

    const handleXPEarned = () => {
      // Refresh both gamification data and daily goals when XP is earned
      refreshGamification();
      refreshGoals();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('goal_preference_changed', handleGoalChange);
      window.addEventListener('xp_earned', handleXPEarned);
      return () => {
        window.removeEventListener('goal_preference_changed', handleGoalChange);
        window.removeEventListener('xp_earned', handleXPEarned);
      };
    }
  }, [refreshGoals, refreshGamification]);

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
          .select('id, paper_id, status, score, percentage, submitted_at, started_at, practice_mode', { count: 'exact' })
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
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

      // Fetch paper details for recent attempts (to show paper names)
      const paperIds = [...new Set(attemptsData.filter((a: any) => a.paper_id).map((a: any) => a.paper_id))];
      let papersMap: Record<string, any> = {};
      if (paperIds.length > 0) {
        const { data: papersData } = await supabase
          .from('past_papers')
          .select('id, title, paper_number, variant, session, year, subjects(name, code)')
          .in('id', paperIds);
        (papersData || []).forEach((p: any) => { papersMap[p.id] = p; });
      }

      // Enrich attempts with paper info
      const enrichedAttempts = attemptsData.map((a: any) => ({
        ...a,
        paper: papersMap[a.paper_id] || null,
      }));

      // Fetch assignments if user has classes
      let assignmentsData: any[] = [];
      const classIds = enrollmentsRes.data?.map((e: any) => e.class_id) || [];
      if (classIds.length > 0) {
        const { data } = await supabase
          .from('assignments')
          .select('id, title, due_at, target_class_id, test_id, paper_id')
          .in('target_class_id', classIds)
          .gte('due_at', new Date().toISOString())
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
        recentAttempts: enrichedAttempts
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
            <p className="text-muted-foreground">Please log in.</p>
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
            {/* Settings removed from here - only available in sidebar */}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Current Streak - First */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Current Streak</p>
                <p className="text-3xl font-bold mt-1">{streakData?.current_streak ?? stats.streak}</p>
                <p className="text-orange-100 text-xs mt-1">
                  {(streakData?.current_streak ?? stats.streak) === 1 ? 'Day' : 'Days'} streak
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total XP */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total XP</p>
                <p className="text-3xl font-bold mt-1">{(gamification?.total_xp ?? stats.xp).toLocaleString()}</p>
                <p className="text-purple-100 text-xs mt-1">Level {gamification?.xp_level ?? 1}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Current Badge/Tier based on level */}
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-yellow-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Current Rank</p>
                <p className="text-3xl font-bold mt-1">{getLevelTitle()}</p>
                <p className="text-yellow-100 text-xs mt-1">Level {gamification?.xp_level ?? 1}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Daily Goal Ring */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-medium">Daily Goal</p>
                {primaryGoal ? (
                  <>
                    <p className="text-3xl font-bold mt-1 text-white">
                      {Math.round((primaryGoal.current_value / primaryGoal.target_value) * 100)}%
                    </p>
                    <p className="text-white/80 text-xs mt-1 font-medium">
                      {primaryGoal.current_value}/{primaryGoal.target_value} {primaryGoal.goal_type === 'xp' ? 'XP' : primaryGoal.goal_type}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold mt-1 text-white">--</p>
                    <p className="text-white/80 text-xs mt-1">Set a goal</p>
                  </>
                )}
              </div>
              <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center">
                {primaryGoal ? (
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${(primaryGoal.current_value / primaryGoal.target_value) * 125.6} 125.6`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <Target className="h-6 w-6 text-white" />
                )}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Button variant="default" className="h-20 sm:h-24 flex-col gap-1 sm:gap-2" asChild>
              <Link href="/student/subjects">
                <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-base">Topical Questions</span>
                <span className="text-xs opacity-80 hidden sm:inline">Practice by topic</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 sm:h-24 flex-col gap-1 sm:gap-2" asChild>
              <Link href="/student/papers">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-base">Past Papers</span>
                <span className="text-xs opacity-80 hidden sm:inline">Full exam practice</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 sm:h-24 flex-col gap-1 sm:gap-2" asChild>
              <Link href="/student/notes">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-base">Revision Notes</span>
                <span className="text-xs opacity-80 hidden sm:inline">Read & review</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 sm:h-24 flex-col gap-1 sm:gap-2" asChild>
              <Link href="/student/flashcards">
                <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-base">Flashcards</span>
                <span className="text-xs opacity-80 hidden sm:inline">Quick recall</span>
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
                  <Link href="/student/papers">View All</Link>
                </Button>
              }
            >
              <div className="space-y-3">
                {recentAttempts.slice(0, 3).map((attempt) => {
                  const paper = attempt.paper;
                  let pNum = paper?.paper_number || '1';
                  if (pNum.toLowerCase().startsWith('paper ')) pNum = pNum.substring(6).trim();
                  const subjectCode = paper?.subjects?.code || '';
                  const variant = paper?.variant || '1';
                  const paperName = paper
                    ? `${paper.subjects?.name || ''} Paper ${pNum}${subjectCode ? ` (${subjectCode}/${variant})` : ''} ${paper.session || ''} ${paper.year || ''}`
                    : 'Paper Practice';
                  const isInProgress = attempt.status === 'in_progress';
                  const dateStr = attempt.submitted_at
                    ? new Date(attempt.submitted_at).toLocaleDateString()
                    : new Date(attempt.started_at).toLocaleDateString();

                  return (
                    <Link
                      key={attempt.id}
                      href={isInProgress
                        ? `/student/papers/${attempt.paper_id}/practice?attempt=${attempt.id}`
                        : `/student/papers/${attempt.paper_id}/results?attempt=${attempt.id}`
                      }
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="font-medium text-sm truncate">{paperName.trim()}</p>
                        <p className="text-xs text-muted-foreground">
                          {isInProgress ? 'In progress' : 'Completed'} · {dateStr}
                        </p>
                      </div>
                      {isInProgress ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs shrink-0">Continue</Badge>
                      ) : attempt.percentage !== null ? (
                        <Badge variant={attempt.percentage >= 70 ? 'default' : attempt.percentage >= 50 ? 'secondary' : 'destructive'} className="shrink-0">
                          {Math.round(attempt.percentage)}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">Done</Badge>
                      )}
                    </Link>
                  );
                })}
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
