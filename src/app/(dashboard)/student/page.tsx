'use client';

import React, { useEffect, useState } from 'react';
import { Star, Flame, Award, BookOpen, Bookmark, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { ContinueWhereYouLeftOff } from '@/components/ContinueWhereYouLeftOff';

interface DashboardStats {
  xp: number;
  streak: number;
  badges: number;
  notesRead: number;
}

const StudentDashboard = () => {
  const { user, loading } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    xp: 0,
    streak: 0,
    badges: 0,
    notesRead: 0
  });
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  async function fetchDashboardData() {
    try {
      // Fetch user stats
      const { data: userData } = await supabase
        .from('users')
        .select('xp, streak_days')
        .eq('id', user?.id)
        .single();

      // Fetch user badges count
      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Fetch recent notes (public or registered visibility)
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, subject_id, topic_id, created_at')
        .in('visibility', ['public', 'registered'])
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch assignments for enrolled classes
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      const classIds = enrollments?.map(e => e.class_id) || [];
      
      let assignmentsData: any[] = [];
      if (classIds.length > 0) {
        const { data } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_at,
            target_class_id,
            test_id,
            paper_id
          `)
          .in('target_class_id', classIds)
          .order('due_at', { ascending: true })
          .limit(5);
        assignmentsData = data || [];
      }

      setStats({
        xp: userData?.xp || 0,
        streak: userData?.streak_days || 0,
        badges: badgesCount || 0,
        notesRead: 0 // TODO: Track this in analytics_events
      });
      setRecentNotes(notes || []);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }

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
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.display_name || 'Student'}!</h1>
        <p className="text-muted-foreground mt-1">Continue your learning journey</p>
      </div>

      {/* Continue Where You Left Off */}
      <ContinueWhereYouLeftOff />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          title="Total XP"
          value={stats.xp.toLocaleString()}
          subtitle="Keep learning!"
        />
        <StatsCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          title="Streak"
          value={`${stats.streak} days`}
          subtitle="Don't break it!"
        />
        <StatsCard
          icon={<Award className="h-5 w-5 text-purple-500" />}
          title="Badges"
          value={stats.badges}
          subtitle="Achievements earned"
        />
        <StatsCard
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          title="Notes Read"
          value={stats.notesRead}
          subtitle="This week"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>My Assignments</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/classes">View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No assignments yet</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/student/assessments/${assignment.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Notes</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/subjects">Browse All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes available</p>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{note.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20" asChild>
              <Link href="/student/subjects">
                <BookOpen className="mr-2 h-5 w-5" />
                Browse Subjects
              </Link>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <Link href="/student/classes">
                <Award className="mr-2 h-5 w-5" />
                My Classes
              </Link>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <Link href="/student/progress">
                <Star className="mr-2 h-5 w-5" />
                View Progress
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
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
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentDashboard;
