import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, Users, FileText, Trophy, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get user stats
  const { data: attempts } = await supabase
    .from('attempts')
    .select('score, max_score, status')
    .eq('user_id', user.id)
    .eq('status', 'graded');

  const totalAttempts = attempts?.length || 0;
  const avgScore = attempts?.length 
    ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length 
    : 0;

  // Get recent activity
  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select('*, assignments(title), tests(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get enrolled classes (for students)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, classes(name, teacher_id)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Get teaching classes (for teachers)
  const { data: teachingClasses } = await supabase
    .from('classes')
    .select('*, enrollments(count)')
    .eq('teacher_id', user.id);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold">Welcome back, {user.display_name}!</h1>
        <p className="text-muted-foreground mt-2">
          {user.role === 'student' && "Continue your learning journey"}
          {user.role === 'teacher' && "Manage your classes and assignments"}
          {user.role === 'super_admin' && "Manage content and users"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP Points</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.xp}</div>
            <p className="text-xs text-muted-foreground">
              Streak: {user.streak_days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Avg Score: {avgScore.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {user.role === 'student' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </CardContent>
          </Card>
        )}

        {user.role === 'teacher' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teachingClasses?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Teaching</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgScore > 0 ? `${avgScore.toFixed(0)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with these common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" className="h-24 flex-col gap-2">
            <Link href="/subjects">
              <BookOpen className="h-6 w-6" />
              <span>Browse Subjects</span>
            </Link>
          </Button>

          {user.role === 'student' && (
            <>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/dashboard/assignments">
                  <FileText className="h-6 w-6" />
                  <span>My Assignments</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/dashboard/classes">
                  <Users className="h-6 w-6" />
                  <span>My Classes</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/leaderboard">
                  <Trophy className="h-6 w-6" />
                  <span>Leaderboard</span>
                </Link>
              </Button>
            </>
          )}

          {user.role === 'teacher' && (
            <>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/teacher/classes">
                  <Users className="h-6 w-6" />
                  <span>My Classes</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/teacher/test-builder">
                  <FileText className="h-6 w-6" />
                  <span>Test Builder</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/teacher/assignments">
                  <FileText className="h-6 w-6" />
                  <span>Assignments</span>
                </Link>
              </Button>
            </>
          )}

          {(user.role === 'super_admin' || user.role === 'content_moderator') && (
            <>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/admin/questions">
                  <FileText className="h-6 w-6" />
                  <span>Question Bank</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/admin/notes">
                  <BookOpen className="h-6 w-6" />
                  <span>Manage Notes</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link href="/admin/users">
                  <Users className="h-6 w-6" />
                  <span>User Management</span>
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentAttempts && recentAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest test attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">
                      {attempt.assignments?.title || attempt.tests?.title || 'Untitled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(attempt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {attempt.status === 'graded' && (
                      <p className="font-bold">
                        {attempt.score}/{attempt.max_score}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground capitalize">
                      {attempt.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
